import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCAzQp8Atq_Ogr4z9Fu17S61eSHk_x13f0",
  authDomain: "school-management-system-89992.firebaseapp.com",
  projectId: "school-management-system-89992",
  storageBucket: "school-management-system-89992.firebasestorage.app",
  messagingSenderId: "558087979723",
  appId: "1:558087979723:web:7d3692743905ee7c54514e",
  measurementId: "G-4DPLHQTGSW"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
