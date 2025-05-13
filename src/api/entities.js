// src/api/entities.js
import API_BASE_URL from './apiclient';

// ---- Security Tasks ----
export const getSecurityTasks = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE_URL}/tasks?${query}`);
  return res.json();
};

export const updateSecurityTask = async (taskId, updates) => {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
};

// ---- Security Scores ----
export const getDashboardData = async () => {
  const res = await fetch(`${API_BASE_URL}/dashboard`);
  return res.json();
};

export const getSecurityScores = async () => {
  const res = await fetch(`${API_BASE_URL}/score/security-scores`);
  if (!res.ok) throw new Error('Failed to fetch security scores');
  return res.json();
};

// ---- Feedback ----
export const submitFeedback = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
};

export const getFeedbackByTask = async (taskId) => {
  const res = await fetch(`${API_BASE_URL}/feedback/${taskId}`);
  return res.json();
};

export const getAIRecordByTaskId = async (securityTaskId) => {
  const res = await fetch(`${API_BASE_URL}/ai-record/${securityTaskId}`); // Adjust endpoint as needed
  if (!res.ok) {
    if (res.status === 404) return null; // Handle 404 gracefully if AI record might not exist
    throw new Error('Failed to fetch AI record');
  }
  return res.json();
};