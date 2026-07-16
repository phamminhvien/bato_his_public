import { FirebaseService } from '../firebase/index.js';
import { store } from '../state/store.js';

export class PresenceService {
  static visitorId = null;

  static async start() {
    this.visitorId = this.getVisitorId();
    
    // Thu thập thông tin
    const deviceInfo = this.getDeviceInfo();
    let locationInfo = { ip: 'Unknown', location: 'Unknown' };
    
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        locationInfo = {
          ip: data.ip || 'Unknown',
          location: `${data.city || ''}, ${data.country_name || ''}`.replace(/^, | , $/g, '') || 'Unknown',
          isp: data.org || ''
        };
      }
    } catch (error) {
      console.warn("Could not fetch IP info:", error);
    }

    const state = store.getState();
    const presenceData = {
      visitorId: this.visitorId,
      email: state.user ? state.user.email : 'Khách',
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      isMobile: deviceInfo.isMobile,
      ip: locationInfo.ip,
      location: locationInfo.location,
      isp: locationInfo.isp,
      loginAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // Ghi lên Firebase (1 lần khi load trang)
    await FirebaseService.setPresence(this.visitorId, presenceData);

    // Lắng nghe sự kiện trước khi đóng trang để xoá presence
    window.addEventListener('beforeunload', () => {
      FirebaseService.removePresence(this.visitorId);
    });
  }

  static getVisitorId() {
    let vid = localStorage.getItem('visitor_id');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      localStorage.setItem('visitor_id', vid);
    }
    return vid;
  }

  static getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    
    if (ua.indexOf('Win') !== -1) os = 'Windows';
    else if (ua.indexOf('Mac') !== -1) os = 'MacOS';
    else if (ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';
    else if (ua.indexOf('Android') !== -1) os = 'Android';
    else if (ua.indexOf('Linux') !== -1) os = 'Linux';

    if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1 && ua.indexOf('OPR') === -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
    else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
    else if (ua.indexOf('Edg') !== -1) browser = 'Edge';
    else if (ua.indexOf('OPR') !== -1) browser = 'Opera';
    else if (ua.indexOf('CocCoc') !== -1) browser = 'Cốc Cốc';

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return { os, browser, isMobile };
  }
}
