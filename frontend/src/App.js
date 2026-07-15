// import React, { useState } from "react";

// function App() {
//   const [input, setInput] = useState("");
//   const [response, setResponse] = useState("");
//   const [history, setHistory] = useState([]);

//   // Form fields
//   const [doctor, setDoctor] = useState("");
//   const [hospital, setHospital] = useState("");
//   const [notes, setNotes] = useState("");

//   // -------- CALL AI --------
//   const callAPI = async (actionType) => {
//     try {
//       const res = await fetch("http://127.0.0.1:8000/agent", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           input: input,
//           action: actionType
//         })
//       });

//       const data = await res.json();
//       setResponse(data.output);

//     } catch (error) {
//       console.error(error);
//       setResponse("❌ Error connecting to backend");
//     }
//   };

//   // -------- FORM SUBMIT (FIXED POSITION) --------
//   const submitForm = () => {
//     const combinedInput = `
// Doctor: ${doctor}
// Hospital: ${hospital}
// Notes: ${notes}
//     `;

//     setInput(combinedInput);

//     // Call AI after setting input
//     callAPI("all");
//   };

//   // -------- GET HISTORY --------
//   const getHistory = async () => {
//     try {
//       const res = await fetch("http://127.0.0.1:8000/data");
//       const data = await res.json();
//       setHistory(data);
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   return (
//     <div style={{ padding: "30px" }}>
//       <h2>🧠 AI-First CRM</h2>

//       {/* TEXT INPUT */}
//       <textarea
//         rows="5"
//         cols="60"
//         placeholder="Type interaction..."
//         value={input}
//         onChange={(e) => setInput(e.target.value)}
//       />

//       <br /><br />

//       {/* ACTION BUTTONS */}
//       <button onClick={() => callAPI("edit")}>✏️ Edit</button>
//       <button onClick={() => callAPI("extract")}>🧠 Extract</button>
//       <button onClick={() => callAPI("summary")}>📋 Summary</button>
//       <button onClick={() => callAPI("suggest")}>💡 Suggest</button>
//       <button onClick={() => callAPI("all")}>🔄 Run All</button>

//       <br /><br />

//       {/* HISTORY BUTTON */}
//       <button onClick={getHistory}>📂 View History</button>

//       <h3>AI Response:</h3>

//       <textarea
//         rows="15"
//         cols="70"
//         value={response}
//         readOnly
//       />

//       {/* SHOW HISTORY */}
//       <h3>Saved Interactions:</h3>

//       {history.map((item, index) => (
//         <div
//           key={index}
//           style={{
//             border: "1px solid gray",
//             margin: "10px",
//             padding: "10px"
//           }}
//         >
//           <p><b>Input:</b> {item.input}</p>
//           <p><b>Output:</b> {item.output}</p>
//         </div>
//       ))}

//       <hr />

//       {/* STRUCTURED FORM */}
//       <h3>📋 Structured Form</h3>

//       <input
//         type="text"
//         placeholder="Doctor Name"
//         value={doctor}
//         onChange={(e) => setDoctor(e.target.value)}
//       />
//       <br /><br />

//       <input
//         type="text"
//         placeholder="Hospital"
//         value={hospital}
//         onChange={(e) => setHospital(e.target.value)}
//       />
//       <br /><br />

//       <textarea
//         rows="3"
//         cols="50"
//         placeholder="Notes"
//         value={notes}
//         onChange={(e) => setNotes(e.target.value)}
//       />
//       <br /><br />

//       <button onClick={submitForm}>
//         Submit Form
//       </button>

//     </div>
//   );
// }

// export default App;

//------------------------------------------------------------------------------

// import React from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { setInput, setOutput, setLoading } from "./redux/interactionSlice";

// function App() {
//   const dispatch = useDispatch();

//   const { input, output, loading } = useSelector(
//     (state) => state.interaction
//   );

//   // CALL BACKEND
//   const runAgent = async (action) => {
//     dispatch(setLoading(true));

//     try {
//       const res = await fetch("http://localhost:8000/run-agent", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           input,
//           action,
//         }),
//       });

//       const data = await res.json();
//       dispatch(setOutput(data.output));
//     } catch (error) {
//       dispatch(setOutput("❌ Error connecting backend"));
//     }

//     dispatch(setLoading(false));
//   };

//   return (
//     <div style={{ padding: "20px", fontFamily: "Inter, sans-serif" }}>
//       <h2>AI-First CRM - HCP Interaction</h2>

//       {/* INPUT BOX */}
//       <textarea
//         rows="6"
//         style={{ width: "100%", padding: "10px" }}
//         placeholder="Enter HCP interaction..."
//         value={input}
//         onChange={(e) => dispatch(setInput(e.target.value))}
//       />

//       <br /><br />

//       {/* BUTTONS */}
//       <button onClick={() => runAgent("all")}>Run Full Flow</button>
//       <button onClick={() => runAgent("edit")}>Edit</button>
//       <button onClick={() => runAgent("extract")}>Extract</button>
//       <button onClick={() => runAgent("summary")}>Summary</button>
//       <button onClick={() => runAgent("suggest")}>Suggest</button>

//       <br /><br />

//       {/* LOADING */}
//       {loading && <p>⏳ Processing...</p>}

//       {/* OUTPUT */}
//       <h3>Output:</h3>
//       <pre
//         style={{
//           background: "#f5f5f5",
//           padding: "10px",
//           whiteSpace: "pre-wrap",
//         }}
//       >
//         {output}
//       </pre>
//     </div>
//   );
// }

// export default App;


import React from "react";
import LogInteractionScreen from "./LogInteractionScreen";

function App() {
  return <LogInteractionScreen />;
}

export default App;