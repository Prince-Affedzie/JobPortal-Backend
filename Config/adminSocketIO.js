const jwt = require('jsonwebtoken');
const { Alert } = require('../Models/AlertModel');

let adminNamespace;

module.exports = {
  initAdminSocketIO: (io) => {
    adminNamespace = io.of('/admin-alerts');
    
    adminNamespace.use((socket, next) => {
      try {
        const token = socket.handshake.headers.cookie
          ?.split(';')
          ?.find(c => c.trim().startsWith('token='))
          ?.split('=')[1];

        if (!token) return next(new Error('No token'));
        const decoded = jwt.verify(token, process.env.token);
        if (decoded.role !== 'admin') return next(new Error('Not authorized'));
        
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    }).on('connection', async (socket) => {
      console.log('Admin connected to alerts');
      
      // Send initial alerts
      const alerts = await Alert.find({ isRead: false })
        .sort({ createdAt: -1 })
        .limit(20);
      socket.emit('INITIAL_ALERTS', alerts);

      socket.on('disconnect', () => {
        console.log('Admin disconnected from alerts');
      });
    });

    return {
      broadcastAdminAlert: (alert) => {
        adminNamespace.emit('ADMIN_ALERT', alert);
      }
    };
  }
};