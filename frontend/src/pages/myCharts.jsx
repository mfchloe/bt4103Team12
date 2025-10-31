import React, { useState, useEffect } from "react";
import { storage } from "../../firebase"; // make sure storage is exported
import { ref, getDownloadURL } from "firebase/storage";
import Papa from "papaparse";

import PieChart from "../components/myCharts/PieChart";
import BarChart from "../components/myCharts/BarChart";
import LineChart from "../components/myCharts/LineChart";
import { useAuth } from "../context/AuthContext.jsx";

export default function MyCharts() {
  const { isFarCustomer, isFirebaseUser, farCustomerSession, user: firebaseUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Firebase user (Cold-start user)
      if (isFirebaseUser && !isFarCustomer) {
        if (!cancelled) {
          setTransactions([]);
          setLoading(false);
        }
        return;
      }

      // Not authenticated in any mode
      if (!isFarCustomer && !isFirebaseUser) {
        if (!cancelled) {
          setTransactions([]);
          setLoading(false);
        }
        return;
      }

      // Far-Trans customer
      if (isFarCustomer && farCustomerSession?.customerId) {
        try {
          const fileRef = ref(storage, "../../backend/datasets/customer_information.csv");
          const url = await getDownloadURL(fileRef);

          await new Promise((resolve, reject) => {
            Papa.parse(url, { download: true, header: true, complete: (results) => {
              if (cancelled) return resolve();
              const allRows = Array.isArray(results.data) ? results.data : [];
              const filtered = allRows.filter(
                (t) => String(t.customerID).trim() === String(farCustomerSession.customerId).trim()
              );
              setTransactions(filtered);
              setLoading(false);
              resolve();
            },
            error: (err) => {
              if (!cancelled) {
                console.error("CSV parse error:", err);
                setTransactions([]);
                setLoading(false);
              }
              reject(err);
            }});
          });
        } catch (err) {
          if (!cancelled) {
            console.error("Error loading FAR transactions:", err);
            setTransactions([]);
            setLoading(false);
          }
        }
        return;
      }

      if (!cancelled) {
        setTransactions([]);
        setLoading(false);
      }
    };

    setLoading(true);
    run();

    return () => cancelled = true;
  }, [isFarCustomer, isFirebaseUser, farCustomerSession]);

  if (!isFarCustomer && !isFirebaseUser) return <p>Please log in to view your transaction charts.</p>;
  if (isFirebaseUser && !isFarCustomer) return <p>You don't have any past transactions yet.</p>
  if (loading) return <p>Loading transactions...</p>;
  if (!transactions.length) return <p>You don't have any past transactions yet.</p>;

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