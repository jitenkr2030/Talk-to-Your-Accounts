import { useState, useEffect } from 'react';
import useProject from '../../hooks/useProject';

const ProjectDashboard = () => {
  const {
    projects,
    projectSummary,
    projectDashboard,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addTimeEntry,
    addProjectExpense,
    addMilestone,
    updateMilestone,
    fetchProjectSummary,
    fetchProjectDashboard,
    exportProjects
  } = useProject();

  const [activeTab, setActiveTab] = useState('projects');
  const [showAddProject, setShowAddProject] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    code: '',
    description: '',
    client_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    deadline: '',
    status: 'planning',
    budget_amount: '',
    billing_type: 'fixed',
    hourly_rate: '',
    total_estimated_hours: '',
    is_active: true,
    notes: ''
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    is_active: ''
  });

  useEffect(() => {
    fetchProjectSummary();
    fetchProjectDashboard();
  }, [fetchProjectSummary, fetchProjectDashboard]);

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    try {
      await createProject(projectForm);
      setShowAddProject(false);
      setProjectForm({
        name: '',
        code: '',
        description: '',
        client_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        deadline: '',
        status: 'planning',
        budget_amount: '',
        billing_type: 'fixed',
        hourly_rate: '',
        total_estimated_hours: '',
        is_active: true,
        notes: ''
      });
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
      } catch (err) {
        console.error('Error deleting project:', err);
      }
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportProjects(filters);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting projects:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-slate-400 mt-1">Track projects, tasks, time and costs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            onClick={() => setShowAddProject(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Project
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {projectSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Projects</p>
            <p className="text-2xl font-bold text-blue-400">{projectSummary.total_projects}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Active Projects</p>
            <p className="text-2xl font-bold text-yellow-400">{projectSummary.active_projects}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Budget</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(projectSummary.total_budget)}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Cost</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(projectSummary.total_actual_cost)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'projects' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          Projects
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          Dashboard
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'projects' && (
        <div className="bg-slate-800 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by name or code"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="">All Status</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="">All</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => fetchProjects(filters)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      {activeTab === 'projects' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Deadline</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Budget</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Cost</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">No projects found</td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="px-4 py-3 text-sm font-mono">{project.code}</td>
                    <td className="px-4 py-3 text-sm font-medium">{project.name}</td>
                    <td className="px-4 py-3 text-sm">{project.client_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{project.deadline || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(project.budget_amount)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(project.actual_cost)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setShowProjectDetails(project.id)}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => updateProject(project.id, { is_active: !project.is_active })}
                          className="p-1 text-green-400 hover:text-green-300"
                          title={project.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && projectDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Projects */}
          <div className="bg-slate-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Active Projects</h3>
            <div className="space-y-3">
              {projectDashboard.activeProjects?.length === 0 ? (
                <p className="text-slate-400">No active projects</p>
              ) : (
                projectDashboard.activeProjects?.map((project) => (
                  <div key={project.id} className="p-3 bg-slate-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-slate-400">{project.code}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Milestones */}
          <div className="bg-slate-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Upcoming Milestones</h3>
            <div className="space-y-3">
              {projectDashboard.upcomingMilestones?.length === 0 ? (
                <p className="text-slate-400">No upcoming milestones</p>
              ) : (
                projectDashboard.upcomingMilestones?.map((milestone) => (
                  <div key={milestone.id} className="p-3 bg-slate-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{milestone.name}</p>
                        <p className="text-sm text-slate-400">{milestone.project_name}</p>
                      </div>
                      <span className="text-sm text-slate-400">{milestone.due_date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="bg-slate-800 p-4 rounded-lg md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Overdue Tasks</h3>
            <div className="space-y-3">
              {projectDashboard.overdueTasks?.length === 0 ? (
                <p className="text-slate-400">No overdue tasks</p>
              ) : (
                projectDashboard.overdueTasks?.map((task) => (
                  <div key={task.id} className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="text-sm text-slate-400">{task.project_name}</p>
                      </div>
                      <span className="text-sm text-red-400">{task.due_date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleProjectSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Project Code</label>
                  <input
                    type="text"
                    value={projectForm.code}
                    onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Description</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={projectForm.start_date}
                    onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={projectForm.deadline}
                    onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Billing Type</label>
                  <select
                    value={projectForm.billing_type}
                    onChange={(e) => setProjectForm({ ...projectForm, billing_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Budget Amount (₹)</label>
                  <input
                    type="number"
                    value={projectForm.budget_amount}
                    onChange={(e) => setProjectForm({ ...projectForm, budget_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={projectForm.hourly_rate}
                    onChange={(e) => setProjectForm({ ...projectForm, hourly_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    value={projectForm.total_estimated_hours}
                    onChange={(e) => setProjectForm({ ...projectForm, total_estimated_hours: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                    step="0.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Notes</label>
                  <textarea
                    value={projectForm.notes}
                    onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows="2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddProject(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;
