import React, { useState, useEffect } from "react";
import { auth, storage } from "../../firebase"; // make sure storage is exported
import { onAuthStateChanged } from "firebase/auth";
import { ref, getDownloadURL } from "firebase/storage";
import Papa from "papaparse";

import PieChart from "../components/myCharts/PieChart";
import BarChart from "../components/myCharts/BarChart";
import LineChart from "../components/myCharts/LineChart";

console.log("Firebase auth object:", auth);

export default function MyCharts() {
  const [transactions, setTransactions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User signed in:", user.uid, user.displayName); // debug signed-in user
        setUserId(user.uid);
        setUserDisplayName(user.displayName);
      } else {
        console.log("No user signed in");
        setUserId(null);
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch CSV only if user is authenticated
  useEffect(() => {
    if (!userId) {
      console.log("No userId yet, skipping CSV fetch");
      return; // do nothing if not signed in
    }

    console.log("Fetching CSV for user:", userDisplayName);

    const fileRef = ref(storage, "customer_transactions.csv"); // adjust path if needed

    getDownloadURL(fileRef)
      .then((url) => {
        console.log("Got download URL:", url);

        Papa.parse(url, {
          download: true,
          header: true,
          complete: (results) => {
            console.log("Raw CSV data:", results.data);

            const userTransactions = results.data.filter(
              (t) => t.customerID === userDisplayName
            );

            console.log("Filtered transactions for user:", userTransactions);

            setTransactions(userTransactions);
            setLoading(false);
          },
          error: (err) => {
            console.error("Error parsing CSV:", err);
            setLoading(false);
          },
        });
      })
      .catch((error) => {
        console.error("Error getting download URL:", error);
        setLoading(false);
      });
  }, [userId]); // added userDisplayName to dependency

  if (!userId) return <p>Please log in to view your transaction charts.</p>;
  if (loading) return <p>Loading transactions...</p>;
  if (!transactions.length) return <p>No transactions found for your account.</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>My Charts</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", marginTop: "2rem" }}>
        <PieChart data={transactions} />
        <BarChart data={transactions} />
        <LineChart data={transactions} />
      </div>
    </div>
  );
}





//consider maybe adding which cluster they are in ? 
// maybe info from customer information with engineered csv