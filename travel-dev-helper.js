// travel-dev-helper.js - Express-based MCP helper

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PROJECT_ROOT = __dirname; // E:\travel_webapp

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MCP Dev Helper running' });
});

// TOOL 1: list_files
app.post('/tools/list_files', (req, res) => {
  const { path: dirPath = '.' } = req.body;
  const fullPath = path.join(PROJECT_ROOT, dirPath);

  const files = [];
  if (fs.existsSync(fullPath)) {
    try {
      const items = fs.readdirSync(fullPath, { withFileTypes: true });
      for (const item of items) {
        files.push({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          path: path.join(dirPath, item.name),
        });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({
    files,
    total_files: files.length,
    directory: dirPath,
  });
});

// TOOL 2: read_file
app.post('/tools/read_file', (req, res) => {
  const { file_path } = req.body;
  const fullPath = path.join(PROJECT_ROOT, file_path);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found', file_path });
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({
      file_path,
      content,
      total_lines: content.split('\n').length,
      language: file_path.endsWith('.js') ? 'javascript' : 'unknown',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOOL 3: write_file
app.post('/tools/write_file', (req, res) => {
  const { file_path, content, mode = 'create' } = req.body;
  const fullPath = path.join(PROJECT_ROOT, file_path);

  try {
    if (mode === 'create' || mode === 'overwrite') {
      fs.writeFileSync(fullPath, content, 'utf-8');
      res.json({
        success: true,
        file_path,
        action: mode,
        message: 'File saved successfully',
      });
    } else {
      res.status(400).json({ error: 'Invalid mode' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOOL 4: run_npm_script
app.post('/tools/run_npm_script', (req, res) => {
  const { script_name } = req.body;
  const { exec } = require('child_process');

  exec(`npm run ${script_name}`, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
    res.json({
      script: script_name,
      exit_code: error ? 1 : 0,
      stdout,
      stderr,
      success: !error,
    });
  });
});
// SSE endpoint for MCP compatibility
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const data = {
    name: "travel-dev-helper",
    version: "1.0.0",
    capabilities: {
      tools: ["list_files", "read_file", "write_file", "run_npm_script"]
    }
  };
  
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  res.end();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Travel Dev Helper running on http://localhost:${PORT}`);
  console.log(`📚 Tools available at http://localhost:${PORT}/tools/*`);
});
