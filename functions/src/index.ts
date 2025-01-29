import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
var serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://todo-8f4cc-default-rtdb.firebaseio.com",
});

const db = admin.database();
const app = express();

// Middleware
app.use(express.json());

// Task Management Endpoints

// Create Task
app.post("/tasks", async (req: any, res: any) => {
  try {
    const task = {
      id: req.body.id, // Generate a unique ID
      title: req.body.title,
      description: req.body.description,
      status: req.body.status || "TO_DO",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!task.id) throw new Error("Failed to generate task ID.");

    await db.ref(`tasks/${task.id}`).set(task);
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error?.message });
  }
});

// Read Tasks (with optional filtering by status)
app.get("/tasks", async (req: any, res: any) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page

    const snapshot = await db.ref("tasks").once("value");
    const tasks = snapshot.val();

    const taskList = Object.values(tasks || {});
    const filteredTasks = status
      ? taskList.filter((task: any) => task.status === status)
      : taskList;

    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

    res.status(200).json({
      currentPage: page,
      totalItems: filteredTasks.length,
      totalPages: Math.ceil(filteredTasks.length / limit),
      tasks: paginatedTasks,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update Task
app.put("/tasks/:id", async (req: any, res: any) => {
  try {
    const taskId = req.params.id;
    const snapshot = await db.ref(`tasks/${taskId}`).once("value");
    const task = snapshot.val();

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const updatedTask = {
      ...task,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await db.ref(`tasks/${taskId}`).update(updatedTask);
    res.status(200).json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Task
app.delete("/tasks/:id", async (req: any, res: any) => {
  try {
    const taskId = req.params.id;
    const snapshot = await db.ref(`tasks/${taskId}`).once("value");
    const task = snapshot.val();

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    await db.ref(`tasks/${taskId}`).remove();
    res.status(200).json({ message: "Task deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Export the API as a Firebase Function
export const api = functions.https.onRequest(app);
