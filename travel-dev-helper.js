// travel-dev-helper.js - Express-based MCP helper
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Root project directory – adjust if needed
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'travel-dev-helper MCP server running' });
});

//
// TOOLS: list_files
//
app.post('/tools/list_files', (req, res) => {
  const { dir = '.' } = req.body || {};
  const targetDir = path.resolve(PROJECT_ROOT, dir);

  fs.readdir(targetDir, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error('Error in /tools/list_files:', err);
      return res.status(500).json({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Unable to list files',
              details: err.message
            })
          }
        ]
      });
    }

    const files = entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory()
    }));

    const payload = { files };

    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload)
        }
      ]
    });
  });
});

//
// TOOLS: read_file
//
app.post('/tools/read_file', (req, res) => {
  const { filePath } = req.body || {};
  if (!filePath) {
    return res.status(400).json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'filePath is required'
          })
        }
      ]
    });
  }

  const targetPath = path.resolve(PROJECT_ROOT, filePath);

  fs.readFile(targetPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error in /tools/read_file:', err);
      return res.status(500).json({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Unable to read file',
              details: err.message
            })
          }
        ]
      });
    }

    const payload = {
      filePath: filePath,
      content: data
    };

    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload)
        }
      ]
    });
  });
});

//
// TOOLS: write_file
//
app.post('/tools/write_file', (req, res) => {
  const { filePath, content } = req.body || {};
  if (!filePath) {
    return res.status(400).json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'filePath is required'
          })
        }
      ]
    });
  }

  const targetPath = path.resolve(PROJECT_ROOT, filePath);

  fs.mkdir(path.dirname(targetPath), { recursive: true }, (dirErr) => {
    if (dirErr) {
      console.error('Error creating directory in /tools/write_file:', dirErr);
      return res.status(500).json({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Unable to create directory',
              details: dirErr.message
            })
          }
        ]
      });
    }

    fs.writeFile(targetPath, content || '', 'utf8', (err) => {
      if (err) {
        console.error('Error in /tools/write_file:', err);
        return res.status(500).json({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Unable to write file',
                details: err.message
              })
            }
          ]
        });
      }

      const payload = {
        filePath: filePath,
        status: 'written'
      };

      res.json({
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload)
          }
        ]
      });
    });
  });
});

//
// TOOLS: run_npm_script
//
app.post('/tools/run_npm_script', (req, res) => {
  const { script, cwd = PROJECT_ROOT } = req.body || {};
  if (!script) {
    return res.status(400).json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'script is required'
          })
        }
      ]
    });
  }

  const cmd = `npm run ${script}`;
  exec(cmd, { cwd }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error in /tools/run_npm_script:', error);
    }

    const payload = {
      script,
      cwd,
      stdout,
      stderr,
      success: !error
    };

    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload)
        }
      ]
    });
  });
});

//
// TOOLS: search (MCP spec style)
//
app.post('/tools/search', async (req, res) => {
  try {
    const { query = '', limit = 5 } = req.body || {};

    // Simple in-memory documents index – later customize
    const docs = [
      {
        id: 'doc-1',
        title: 'Travel MCP Server Overview',
        url: 'https://github.com/muraliforex1611/travel-dev-helper',
        description: 'Node.js Express MCP server for travel webapp, deployed on Render.'
      },
      {
        id: 'doc-2',
        title: 'Render Live Server',
        url: 'https://travel-dev-helper.onrender.com',
        description: 'Live MCP server endpoint running on Render free tier.'
      },
      {
        id: 'doc-3',
        title: 'OpenAI MCP Docs',
        url: 'https://platform.openai.com/docs/mcp',
        description: 'Official documentation for Model Context Protocol (MCP).'
      },
      {
        id: 'doc-4',
        title: 'MCP Specification Site',
        url: 'https://modelcontextprotocol.io',
        description: 'Specification details for MCP tools, search, fetch, and SSE.'
      }
    ];

    const q = String(query || '').toLowerCase();

    const filtered = docs
      .filter(d => {
        const text = (d.title + ' ' + d.description).toLowerCase();
        return q === '' || text.includes(q);
      })
      .slice(0, limit);

    const innerPayload = {
      results: filtered.map(d => ({
        id: d.id,
        title: d.title,
        url: d.url
      }))
    };

    const responseBody = {
      content: [
        {
          type: 'text',
          text: JSON.stringify(innerPayload)
        }
      ]
    };

    res.json(responseBody);
  } catch (err) {
    console.error('Error in /tools/search:', err);
    res.status(500).json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            results: [],
            error: 'Internal server error in search tool'
          })
        }
      ]
    });
  }
});

//
// SSE endpoint (basic scaffold; we will refine later)
//
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`event: ping\n`);
  res.write(`data: {"message":"sse connection ok"}\n\n`);

  req.on('close', () => {
    res.end();
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`travel-dev-helper server running on port ${PORT}`);
});
