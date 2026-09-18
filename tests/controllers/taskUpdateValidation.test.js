const mongoose = require('mongoose');
const Task = require('../../model/task');
const {
  updateTask,
  updateTaskStatus,
  updateSubtasks,
} = require('../../controller/taskController');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

async function run(handler, req) {
  const res = mockRes();
  const next = jest.fn();
  await handler(req, res, next);
  return { res, next };
}

describe('Task updates run schema validation', () => {
  let task;

  beforeEach(async () => {
    await Task.deleteMany({});
    task = await Task.create({ creatorId: new mongoose.Types.ObjectId(), title: 'Edit vlog' });
  });

  it('rejects an unknown status on PATCH /status and leaves the task unchanged', async () => {
    const { res, next } = await run(updateTaskStatus, {
      params: { id: task._id.toString() },
      body: { status: 'banana' },
    });

    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'ValidationError' }));
    expect((await Task.findById(task._id)).status).toBe('todo');
  });

  it('rejects an unknown priority on PUT', async () => {
    const { next } = await run(updateTask, {
      params: { id: task._id.toString() },
      body: { priority: 'whenever' },
    });

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'ValidationError' }));
    expect((await Task.findById(task._id)).priority).toBe('medium');
  });

  it('rejects a subtask without a title', async () => {
    const { next } = await run(updateSubtasks, {
      params: { id: task._id.toString() },
      body: { subtasks: [{ completed: true }] },
    });

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'ValidationError' }));
  });

  it('still applies a valid status', async () => {
    const { res } = await run(updateTaskStatus, {
      params: { id: task._id.toString() },
      body: { status: 'in_progress' },
    });

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, task: expect.objectContaining({ status: 'in_progress' }) })
    );
  });

  it('returns 404 when the task no longer exists', async () => {
    await Task.deleteMany({});

    const { res } = await run(updateTaskStatus, {
      params: { id: task._id.toString() },
      body: { status: 'completed' },
    });

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
