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
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (res.ok) {
        const data = await res.json();
        locationInfo = {
          ip: data.ip || 'Unknown',
          location: `${data.city || ''}, ${data.country || ''}`.replace(/^, | , $/g, '') || 'Unknown',
          isp: data.organization_name || data.organization || ''
        };
      }
    } catch (error) {
      console.warn("Could not fetch IP info:", error);
    }

    this.deviceInfo = this.getDeviceInfo();
    this.locationInfo = locationInfo;
    this.loginAt = new Date().toISOString();

    const sendPresence = async (email) => {
      const presenceData = {
        visitorId: this.visitorId,
        email: email,
        os: this.deviceInfo.os,
        browser: this.deviceInfo.browser,
        isMobile: this.deviceInfo.isMobile,
        ip: this.locationInfo.ip,
        location: this.locationInfo.location,
        isp: this.locationInfo.isp,
        loginAt: this.loginAt,
        userAgent: navigator.userAgent
      };
      await FirebaseService.setPresence(this.visitorId, presenceData);
    };

    // Ghi lên Firebase lần đầu
    const state = store.getState();
    const initialEmail = state.currentUser ? state.currentUser.email : 'Khách';
    this.lastEmail = initialEmail;
    await sendPresence(initialEmail);
    
    // Nếu user đăng nhập sau khi load trang, cập nhật lại email cùng toàn bộ thông tin
    store.subscribe((newState) => {
      const email = newState.currentUser ? newState.currentUser.email : 'Khách';
      if (email !== this.lastEmail) {
        this.lastEmail = email;
        sendPresence(email);
      }
    });

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
