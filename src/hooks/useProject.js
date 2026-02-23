import { useState, useEffect, useCallback } from 'react';

const useProject = () => {
  const [projects, setProjects] = useState([]);
  const [projectSummary, setProjectSummary] = useState(null);
  const [projectDashboard, setProjectDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all projects
  const fetchProjects = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.project.getAll(filters);
      setProjects(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch project by ID
  const fetchProjectById = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.project.getById(projectId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create project
  const createProject = useCallback(async (projectData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.create(projectData);
      await fetchProjects();
      await fetchProjectSummary();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, fetchProjectSummary]);

  // Update project
  const updateProject = useCallback(async (projectId, projectData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.update(projectId, projectData);
      await fetchProjects();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  // Delete project
  const deleteProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.delete(projectId);
      await fetchProjects();
      await fetchProjectSummary();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, fetchProjectSummary]);

  // Add task
  const addTask = useCallback(async (projectId, taskData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.addTask(projectId, taskData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update task
  const updateTask = useCallback(async (taskId, taskData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.updateTask(taskId, taskData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.deleteTask(taskId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add time entry
  const addTimeEntry = useCallback(async (projectId, entryData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.addTimeEntry(projectId, entryData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete time entry
  const deleteTimeEntry = useCallback(async (entryId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.deleteTimeEntry(entryId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add project expense
  const addProjectExpense = useCallback(async (projectId, expenseData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.addExpense(projectId, expenseData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete project expense
  const deleteProjectExpense = useCallback(async (expenseId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.deleteExpense(expenseId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add milestone
  const addMilestone = useCallback(async (projectId, milestoneData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.addMilestone(projectId, milestoneData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update milestone
  const updateMilestone = useCallback(async (milestoneId, milestoneData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.project.updateMilestone(milestoneId, milestoneData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch project summary
  const fetchProjectSummary = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.project.getSummary(filters);
      setProjectSummary(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch project dashboard
  const fetchProjectDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.project.getDashboard();
      setProjectDashboard(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export projects
  const exportProjects = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.project.export(filters);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchProjects();
    fetchProjectSummary();
    fetchProjectDashboard();
  }, [fetchProjects, fetchProjectSummary, fetchProjectDashboard]);

  return {
    // State
    projects,
    projectSummary,
    projectDashboard,
    loading,
    error,

    // Project operations
    fetchProjects,
    fetchProjectById,
    createProject,
    updateProject,
    deleteProject,

    // Task operations
    addTask,
    updateTask,
    deleteTask,

    // Time entry operations
    addTimeEntry,
    deleteTimeEntry,

    // Expense operations
    addProjectExpense,
    deleteProjectExpense,

    // Milestone operations
    addMilestone,
    updateMilestone,

    // Summary and dashboard
    fetchProjectSummary,
    fetchProjectDashboard,
    exportProjects
  };
};

export default useProject;
