import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Paper, 
  TextField, 
  Typography, 
  Alert, 
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider
} from '@mui/material';
import axios from '../../utils/axiosConfig';

const DatabaseAdmin = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Executing query:', query);
      const response = await axios.post('/api/admin/database/execute', { query });
      console.log('Query response:', response.data);
      setResult(response.data);
    } catch (err) {
      console.error('Query execution error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'An error occurred while executing the query'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatResult = (data) => {
    if (!data) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return String(data);
    }
  };

  // Test API connection
  const testApiConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing API connection');
      const response = await axios.get('/api/admin/test');
      console.log('API test response:', response.data);
      setResult({
        success: true,
        data: {
          message: 'API connection successful',
          response: response.data
        }
      });
    } catch (err) {
      console.error('API test error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'An error occurred while testing the API connection'
      );
    } finally {
      setLoading(false);
    }
  };

  // Common queries
  const commonQueries = [
    // Read Queries
    {
      name: 'List All Users',
      description: 'Get all users in the system',
      query: `db.collection('users').find({}).toArray()`,
      type: 'read'
    },
    {
      name: 'Count Items by Category',
      description: 'Get count of items grouped by category',
      query: `db.collection('items').aggregate([
  { $group: { _id: "$category", count: { $sum: 1 } } },
  { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
  { $project: { _id: 1, count: 1, categoryName: { $arrayElemAt: ["$category.name", 0] } } }
]).toArray()`,
      type: 'read'
    },
    {
      name: 'Find Inactive Users',
      description: 'Find users who have not logged in recently',
      query: `db.collection('users').find({
  lastLogin: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
}).toArray()`,
      type: 'read'
    },
    {
      name: 'List All Locations',
      description: 'Get all locations in the system',
      query: `db.collection('locations').find({}).toArray()`,
      type: 'read'
    },
    {
      name: 'Find Items Without Categories',
      description: 'Find items that do not have a category assigned',
      query: `db.collection('items').find({ category: { $exists: false } }).toArray()`,
      type: 'read'
    },
    {
      name: 'User Statistics',
      description: 'Get statistics about users by role',
      query: `db.collection('users').aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
]).toArray()`,
      type: 'read'
    },
    {
      name: 'Items by Location',
      description: 'Get count of items by location',
      query: `db.collection('items').aggregate([
  { $group: { _id: "$location", count: { $sum: 1 } } },
  { $lookup: { from: "locations", localField: "_id", foreignField: "_id", as: "location" } },
  { $project: { _id: 1, count: 1, locationName: { $arrayElemAt: ["$location.name", 0] } } }
]).toArray()`,
      type: 'read'
    },
    {
      name: 'Recent Items',
      description: 'Get 10 most recently added items',
      query: `db.collection('items').find({}).sort({ createdAt: -1 }).limit(10).toArray()`,
      type: 'read'
    },
    
    // Write Queries
    {
      name: 'Update User Role',
      description: 'Change a user\'s role (replace USER_ID and ROLE)',
      query: `db.collection('users').updateOne(
  { _id: ObjectId("USER_ID") },
  { $set: { role: "ROLE" } }
)`,
      type: 'write'
    },
    {
      name: 'Delete Inactive Users',
      description: 'Delete users who haven\'t logged in for 1 year (CAUTION)',
      query: `db.collection('users').deleteMany({
  lastLogin: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
})`,
      type: 'write'
    },
    {
      name: 'Reset User Password',
      description: 'Reset a user\'s password hash (replace USER_ID)',
      query: `db.collection('users').updateOne(
  { _id: ObjectId("USER_ID") },
  { $set: { password: "$2a$10$yCzWZVN5cQnEYiHJUNQGQOCKCZ2RZm0L3Cf5q0NjFsKxk.tpUF.1e" } }
)`,
      type: 'write'
    },
    {
      name: 'Add Admin User',
      description: 'Create a new admin user (replace GROUP_ID)',
      query: `db.collection('users').insertOne({
  name: "New Admin",
  email: "admin@example.com",
  password: "$2a$10$yCzWZVN5cQnEYiHJUNQGQOCKCZ2RZm0L3Cf5q0NjFsKxk.tpUF.1e",
  role: "admin",
  group: ObjectId("GROUP_ID"),
  createdAt: new Date(),
  lastLogin: new Date()
})`,
      type: 'write'
    }
  ];

  // Execute a common query
  const executeCommonQuery = (queryText) => {
    setQuery(queryText);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Executing common query:', queryText);
      axios.post('/api/admin/database/execute', { query: queryText })
        .then(response => {
          console.log('Query response:', response.data);
          setResult(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Query execution error:', err);
          setError(
            err.response?.data?.message || 
            err.message || 
            'An error occurred while executing the query'
          );
          setLoading(false);
        });
    } catch (err) {
      console.error('Query execution error:', err);
      setError(
        err.message || 
        'An error occurred while executing the query'
      );
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Database Administration
        </Typography>
        
        <Alert severity="warning" sx={{ mb: 3 }}>
          Warning: This page allows direct database access. Use with caution as improper queries can damage your data.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={testApiConnection}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Test API Connection
          </Button>
        </Box>

        {/* Common Queries Section */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Common Queries
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Click on any of these buttons to execute common database queries.
          </Typography>
          
          <Grid container spacing={2}>
            {commonQueries.map((commonQuery, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: commonQuery.type === 'write' ? 'error.light' : 'inherit'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" component="h3">
                        {commonQuery.name}
                      </Typography>
                      {commonQuery.type === 'write' && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            bgcolor: 'error.light', 
                            color: 'error.contrastText',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontWeight: 'bold'
                          }}
                        >
                          WRITE
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {commonQuery.description}
                    </Typography>
                    {commonQuery.type === 'write' && (
                      <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                        This query modifies data
                      </Alert>
                    )}
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button 
                      size="small" 
                      color="primary"
                      onClick={() => executeCommonQuery(commonQuery.query)}
                      disabled={loading}
                    >
                      Execute Query
                    </Button>
                    <Button 
                      size="small"
                      onClick={() => setQuery(commonQuery.query)}
                    >
                      Copy to Editor
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Execute MongoDB Query
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Enter a MongoDB query in JavaScript format. For example:
            <br />
            <code>db.users.find(&#123;role: "admin"&#125;)</code>
            <br />
            <code>db.items.updateOne(&#123;_id: ObjectId("...")&#125;, &#123;$set: &#123;name: "New Name"&#125;&#125;)</code>
          </Typography>
          
          <TextField
            label="MongoDB Query"
            multiline
            rows={6}
            value={query}
            onChange={handleQueryChange}
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            placeholder="db.collection.find({...})"
          />
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={executeQuery}
            disabled={loading || !query.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'Execute Query'}
          </Button>
        </Paper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {result && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Query Result
            </Typography>
            <Box 
              component="pre" 
              sx={{ 
                p: 2, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '400px'
              }}
            >
              {formatResult(result)}
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default DatabaseAdmin;
