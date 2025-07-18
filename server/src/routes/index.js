import express from 'express';
import { v4 as uuidv4 } from 'uuid';

export function setupRoutes(app, claudeService) {
  const router = express.Router();
  
  // Health check for Claude Code service
  router.get('/health', async (req, res) => {
    try {
      const health = await claudeService.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });
  
  // Send a prompt to Claude Code
  router.post('/ask', async (req, res) => {
    try {
      const { prompt, sessionId, format = 'json', workingDirectory } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          error: 'Prompt is required'
        });
      }
      
      const response = await claudeService.sendPrompt(prompt, {
        sessionId,
        format,
        workingDirectory,
        streaming: false
      });
      
      res.json(response);
    } catch (error) {
      console.error('Error in /ask endpoint:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Start a streaming session
  router.post('/stream/start', async (req, res) => {
    try {
      const { prompt, workingDirectory } = req.body;
      const sessionId = uuidv4();
      
      if (!prompt) {
        return res.status(400).json({
          error: 'Prompt is required'
        });
      }
      
      const response = await claudeService.sendStreamingPrompt(prompt, {
        sessionId,
        workingDirectory
      });
      
      res.json(response);
    } catch (error) {
      console.error('Error starting streaming session:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Send prompt to existing streaming session
  router.post('/stream/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          error: 'Prompt is required'
        });
      }
      
      const response = await claudeService.sendToExistingSession(sessionId, prompt);
      res.json(response);
    } catch (error) {
      console.error('Error sending to streaming session:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Close a streaming session
  router.delete('/stream/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const response = await claudeService.closeSession(sessionId);
      res.json(response);
    } catch (error) {
      console.error('Error closing session:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Get active sessions
  router.get('/sessions', (req, res) => {
    try {
      const sessions = claudeService.getActiveSessions();
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Handle permission prompts
  router.post('/permission/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { response: userResponse } = req.body;
      
      if (userResponse === undefined) {
        return res.status(400).json({
          error: 'Response is required (e.g., "y", "n", or custom response)'
        });
      }
      
      const result = await claudeService.handlePermissionPrompt(sessionId, userResponse);
      res.json(result);
    } catch (error) {
      console.error('Error handling permission prompt:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Get server info
  router.get('/info', (req, res) => {
    res.json({
      name: 'Claude Companion Server',
      version: '1.0.0',
      claudeCodeAvailable: claudeService.isAvailable(),
      endpoints: {
        ask: 'POST /api/ask',
        streamStart: 'POST /api/stream/start',
        streamSend: 'POST /api/stream/:sessionId',
        streamClose: 'DELETE /api/stream/:sessionId',
        sessions: 'GET /api/sessions',
        permission: 'POST /api/permission/:sessionId',
        health: 'GET /api/health'
      },
      websocket: '/ws'
    });
  });
  
  // Mount API routes
  app.use('/api', router);
}