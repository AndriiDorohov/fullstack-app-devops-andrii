/**
 * Main React application component
 * Shows time from the backend and a simple tasks UI
 */

import { useEffect, useState } from "react"; // React hooks for state and effects
import "./App.css";                          // Styles for the component

function App() {
    // State for time data from the backend
    const [data, setData] = useState("Loading...");

    // State for tracking loading status of time request
    const [loading, setLoading] = useState(true);

    // State for tracking errors when fetching time
    const [error, setError] = useState(false);

    // State for tasks list
    const [tasks, setTasks] = useState([]);

    // State for new task title input
    const [newTaskTitle, setNewTaskTitle] = useState("");

    // State for tracking tasks loading status
    const [tasksLoading, setTasksLoading] = useState(false);

    // State for tasks-related errors
    const [tasksError, setTasksError] = useState("");

    // Effect that runs once after component mount
    useEffect(() => {
        // Function to fetch time data from the backend
        const fetchData = async () => {
            try {
                setLoading(true); // Enable loading state for time

                // Try several URL variants to reach the backend
                const urls = [
                    "/api",                                    // Relative path via proxy / Nginx
                    "http://localhost:3000/api",               // Local host (dev mode)
                    "http://backend:3000/api",                 // Docker service (legacy port)
                    window.location.origin.replace("80", "3000") + "/api" // Replace port if needed
                ];

                console.log("Trying URLs:", urls);
                let connected = false;
                let finalResult = null;

                // Try all URL options one by one
                for (const url of urls) {
                    if (connected) break; // Stop loop if we already connected

                    try {
                        console.log("Trying URL:", url);
                        // Perform request with CORS options
                        const response = await fetch(url, {
                            mode: "cors",
                            headers: { "Content-Type": "application/json" },
                            method: "GET"
                        });

                        // If we got a successful response
                        if (response.ok) {
                            const result = await response.json();
                            console.log("Success with URL:", url, "Data:", result);
                            finalResult = result;
                            connected = true;
                            break;
                        }
                    } catch (e) {
                        // Log error for the specific URL
                        console.log(`Failed with URL ${url}:`, e.message);
                    }
                }

                // Process result if connection was successful
                if (connected && finalResult) {
                    setData(finalResult.time); // Save time in state
                    setError(false);           // Reset error state
                } else {
                    // If all attempts failed, throw an error
                    throw new Error("All connection attempts failed");
                }

                setLoading(false); // Disable loading state
            } catch (error) {
                // Error handling for time fetching
                console.error("Error fetching data:", error);
                setError(true);     // Enable error state
                setLoading(false);  // Disable loading state
            }
        };

        // Function to fetch tasks from the backend
        const fetchTasks = async () => {
            try {
                setTasksLoading(true);
                setTasksError("");

                const res = await fetch("/api/tasks");
                if (!res.ok) {
                    throw new Error("Failed to fetch tasks");
                }

                const data = await res.json();
                setTasks(data);
            } catch (err) {
                console.error("Error fetching tasks:", err);
                setTasksError(err.message || "Unexpected tasks error");
            } finally {
                setTasksLoading(false);
            }
        };

        // Initial load
        fetchData();
        fetchTasks();

        // Set up periodic time refresh every 8 seconds
        const interval = setInterval(fetchData, 8000);

        // Cleanup function on component unmount
        return () => clearInterval(interval);
    }, []); // Empty dependency array → effect runs only on mount

    // Handler for creating a new task
    const handleAddTask = async (e) => {
        e.preventDefault();

        const trimmed = newTaskTitle.trim();
        if (!trimmed) {
            return;
        }

        try {
            setTasksError("");

            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ title: trimmed }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to create task");
            }

            const created = await res.json();
            // Prepend new task to the list
            setTasks((prev) => [created, ...prev]);
            setNewTaskTitle("");
        } catch (err) {
            console.error("Error creating task:", err);
            setTasksError(err.message || "Unexpected tasks error");
        }
    };

    // Handler for toggling task is_done flag
    const handleToggleTask = async (id) => {
        try {
            setTasksError("");

            const res = await fetch(`/api/tasks/${id}/toggle`, {
                method: "PATCH",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to update task");
            }

            const updated = await res.json();

            setTasks((prev) =>
                prev.map((task) => (task.id === updated.id ? updated : task))
            );
        } catch (err) {
            console.error("Error toggling task:", err);
            setTasksError(err.message || "Unexpected tasks error");
        }
    };

    // Handler for deleting a task
    const handleDeleteTask = async (id) => {
        try {
            setTasksError("");

            const res = await fetch(`/api/tasks/${id}`, {
                method: "DELETE",
            });

            if (!res.ok && res.status !== 204) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to delete task");
            }

            setTasks((prev) => prev.filter((task) => task.id !== id));
        } catch (err) {
            console.error("Error deleting task:", err);
            setTasksError(err.message || "Unexpected tasks error");
        }
    };

    // Component rendering
    return (
        <div className="container">
            <div className="card">
                {/* Animated pulse element */}
                <div className="pulse"></div>

                {/* Title with gradient highlight */}
                <h1 className="title">
                    Docker <span className="highlight">Fullstack</span> App
                </h1>

                {/* Clock container */}
                <div className="clock-container">
                    <div className={`clock ${loading ? "loading" : ""}`}>
                        <div className="clock-face">
                            <div className="time">
                                {/* Show error or time depending on state */}
                                {error ? "Couldn't connect to server" : data}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subtitle */}
                <p className="subtitle">
                    Час з PostgreSQL бази даних через Node.js API
                </p>

                {/* Tech stack */}
                <div className="tech-stack">
                    <div className="tech-item">React</div>
                    <div className="tech-item">Express</div>
                    <div className="tech-item">PostgreSQL</div>
                    <div className="tech-item">Docker</div>
                </div>

                {/* Tasks section */}
                <div className="tasks-section">
                    <h2 className="tasks-title">Tasks</h2>

                    <form onSubmit={handleAddTask} className="tasks-form">
                        <input
                            type="text"
                            placeholder="New task title"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="tasks-input"
                        />
                        <button type="submit" className="tasks-add-button">
                            Add task
                        </button>
                    </form>

                    {tasksError && (
                        <p className="tasks-error">Error: {tasksError}</p>
                    )}

                    {tasksLoading ? (
                        <p className="tasks-loading">Loading tasks...</p>
                    ) : tasks.length === 0 ? (
                        <p className="tasks-empty">No tasks yet. Add one above.</p>
                    ) : (
                        <ul className="tasks-list">
                            {tasks.map((task) => (
                                <li key={task.id} className="task-item">
                                    <div className="task-main">
                                        <span
                                            className={
                                                task.is_done ? "task-title done" : "task-title"
                                            }
                                        >
                                            {task.title}
                                        </span>
                                        <small className="task-status">
                                            ({task.is_done ? "done" : "not done"})
                                        </small>
                                    </div>
                                    <div className="task-actions">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleTask(task.id)}
                                            className="task-button toggle"
                                        >
                                            Toggle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="task-button delete"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
