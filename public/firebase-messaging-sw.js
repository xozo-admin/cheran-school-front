/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCAzQp8Atq_Ogr4z9Fu17S61eSHk_x13f0',
  authDomain: 'school-management-system-89992.firebaseapp.com',
  projectId: 'school-management-system-89992',
  storageBucket: 'school-management-system-89992.firebasestorage.app',
  messagingSenderId: '558087979723',
  appId: '1:558087979723:web:7d3692743905ee7c54514e',
  measurementId: 'G-4DPLHQTGSW',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'New Notification';
  const options = {
    body: payload?.notification?.body || '',
    icon: '/next.svg',
    data: payload?.data || {},
  };

  self.registration.showNotification(title, options);
});
