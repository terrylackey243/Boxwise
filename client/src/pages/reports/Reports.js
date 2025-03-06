import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Assessment as ReportIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  TableChart as TableIcon,
  BarChart as ChartIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';

const Reports = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('inventory');
  const [reportFormat, setReportFormat] = useState('table');
  const [reportData, setReportData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState([]);
  
  const [filters, setFilters] = useState({
    location: '',
    category: '',
    label: '',
    archived: false,
    dateFrom: '',
    dateTo: ''
  });
  
  const [columns, setColumns] = useState({
    name: true,
    assetId: true,
    location: true,
    category: true,
    labels: true,
    quantity: true,
    value: false,
    purchaseDate: false,
    warrantyExpires: false
  });
  
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch locations, categories, and labels from the API
        const [locationsRes, categoriesRes, labelsRes] = await Promise.all([
          axios.get('/api/locations?flat=true'),
          axios.get('/api/categories'),
          axios.get('/api/labels')
        ]);
        
        setLocations(locationsRes.data.data || []);
        setCategories(categoriesRes.data.data || []);
        setLabels(labelsRes.data.data || []);
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading data');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, [setErrorAlert]);

  const handleReportTypeChange = (e) => {
    setReportType(e.target.value);
  };

  const handleReportFormatChange = (e) => {
    setReportFormat(e.target.value);
  };

  const handleFilterChange = (filter, value) => {
    setFilters({
      ...filters,
      [filter]: value
    });
  };

  const handleColumnChange = (column) => {
    setColumns({
      ...columns,
      [column]: !columns[column]
    });
  };

  const generateReport = async () => {
    setGenerating(true);
    
    try {
      // Build query parameters based on filters
      const params = new URLSearchParams();
      
      if (filters.location) params.append('location', filters.location);
      if (filters.category) params.append('category', filters.category);
      if (filters.label) params.append('label', filters.label);
      if (filters.archived) params.append('archived', 'true');
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      
      // Make API call to generate the report
      let response;
      
      // Map the report type to the correct API endpoint
      let endpoint;
      if (reportType === 'inventory') {
        endpoint = 'inventory';
      } else if (reportType === 'value') {
        endpoint = 'categories';
      } else if (reportType === 'location') {
        endpoint = 'locations';
      }
      
      response = await axios.get(`/api/reports/${endpoint}?${params.toString()}`);
      
      if (response.data.success) {
        // Process the data based on report type
        if (reportType === 'inventory') {
          setReportData(response.data.data.items || []);
        } else if (reportType === 'value') {
          // Transform category data to match expected format
          const categoryData = response.data.data.categories.map(category => ({
            category: { name: category.name },
            itemCount: category.itemCount,
            totalValue: category.value || 0
          }));
          setReportData(categoryData);
        } else if (reportType === 'location') {
          // Transform location data to match expected format
          const locationData = response.data.data.locations.map(location => ({
            location: { name: location.name },
            itemCount: location.itemCount,
            totalValue: location.value || 0
          }));
          setReportData(locationData);
        }
      } else {
        setErrorAlert('Error generating report: ' + response.data.message);
      }
      setSuccessAlert('Report generated successfully');
    } catch (err) {
      setErrorAlert('Error generating report');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    if (reportData.length === 0) return;
    
    try {
      let csvContent = '';
      
      // Create headers based on report type and selected columns
      if (reportType === 'inventory') {
        const headers = [];
        if (columns.name) headers.push('Name');
        if (columns.assetId) headers.push('Asset ID');
        if (columns.location) headers.push('Location');
        if (columns.category) headers.push('Category');
        if (columns.labels) headers.push('Labels');
        if (columns.quantity) headers.push('Quantity');
        if (columns.value) headers.push('Value');
        if (columns.purchaseDate) headers.push('Purchase Date');
        if (columns.warrantyExpires) headers.push('Warranty Expires');
        
        csvContent = headers.join(',') + '\n';
        
        // Add data rows
        reportData.forEach(item => {
          const row = [];
          if (columns.name) row.push(`"${item.name}"`);
          if (columns.assetId) row.push(`"${item.assetId}"`);
          if (columns.location) row.push(`"${item.location.name}"`);
          if (columns.category) row.push(`"${item.category.name}"`);
          if (columns.labels) row.push(`"${item.labels.map(l => l.name).join(', ')}"`);
          if (columns.quantity) row.push(item.quantity);
          if (columns.value) row.push(item.value);
          if (columns.purchaseDate) row.push(item.purchaseDate || '');
          if (columns.warrantyExpires) row.push(item.warrantyExpires || '');
          
          csvContent += row.join(',') + '\n';
        });
      } else if (reportType === 'value') {
        csvContent = 'Category,Item Count,Total Value\n';
        
        reportData.forEach(item => {
          csvContent += `"${item.category.name}",${item.itemCount},${item.totalValue}\n`;
        });
      } else if (reportType === 'location') {
        csvContent = 'Location,Item Count,Total Value\n';
        
        reportData.forEach(item => {
          csvContent += `"${item.location.name}",${item.itemCount},${item.totalValue}\n`;
        });
      }
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `boxwise-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessAlert('Report downloaded successfully');
    } catch (err) {
      setErrorAlert('Error downloading report');
      console.error(err);
    }
  };

  const renderReportTable = () => {
    if (reportData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <ReportIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Generate a report to see data
          </Typography>
        </Box>
      );
    }
    
    if (reportType === 'inventory') {
      return (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.name && <TableCell>Name</TableCell>}
                {columns.assetId && <TableCell>Asset ID</TableCell>}
                {columns.location && <TableCell>Location</TableCell>}
                {columns.category && <TableCell>Category</TableCell>}
                {columns.labels && <TableCell>Labels</TableCell>}
                {columns.quantity && <TableCell align="right">Quantity</TableCell>}
                {columns.value && <TableCell align="right">Value</TableCell>}
                {columns.purchaseDate && <TableCell>Purchase Date</TableCell>}
                {columns.warrantyExpires && <TableCell>Warranty Expires</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.map((item) => (
                <TableRow key={item._id}>
                  {columns.name && <TableCell>{item.name}</TableCell>}
                  {columns.assetId && <TableCell>{item.assetId}</TableCell>}
                  {columns.location && <TableCell>{item.location.name}</TableCell>}
                  {columns.category && <TableCell>{item.category.name}</TableCell>}
                  {columns.labels && (
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {item.labels.map((label) => (
                          <Chip
                            key={label.name}
                            label={label.name}
                            size="small"
                            sx={{
                              bgcolor: label.color,
                              color: 'white',
                            }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                  )}
                  {columns.quantity && <TableCell align="right">{item.quantity}</TableCell>}
                  {columns.value && <TableCell align="right">${item.value.toFixed(2)}</TableCell>}
                  {columns.purchaseDate && <TableCell>{item.purchaseDate || '-'}</TableCell>}
                  {columns.warrantyExpires && <TableCell>{item.warrantyExpires || '-'}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    } else if (reportType === 'value') {
      return (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">Item Count</TableCell>
                <TableCell align="right">Total Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.category.name}</TableCell>
                  <TableCell align="right">{item.itemCount}</TableCell>
                  <TableCell align="right">${item.totalValue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {reportData.reduce((sum, item) => sum + item.itemCount, 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ${reportData.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      );
    } else if (reportType === 'location') {
      return (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Location</TableCell>
                <TableCell align="right">Item Count</TableCell>
                <TableCell align="right">Total Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.location.name}</TableCell>
                  <TableCell align="right">{item.itemCount}</TableCell>
                  <TableCell align="right">${item.totalValue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {reportData.reduce((sum, item) => sum + item.itemCount, 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ${reportData.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 64px)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Custom Reports
        </Typography>
        <Typography variant="body1" paragraph>
          Generate custom reports for your inventory. Select a report type, apply filters, and customize columns to get the data you need.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Report Type
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="report-type-label">Report Type</InputLabel>
                  <Select
                    labelId="report-type-label"
                    id="report-type"
                    value={reportType}
                    label="Report Type"
                    onChange={handleReportTypeChange}
                  >
                    <MenuItem value="inventory">Inventory List</MenuItem>
                    <MenuItem value="value">Value by Category</MenuItem>
                    <MenuItem value="location">Items by Location</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel id="report-format-label">Report Format</InputLabel>
                  <Select
                    labelId="report-format-label"
                    id="report-format"
                    value={reportFormat}
                    label="Report Format"
                    onChange={handleReportFormatChange}
                  >
                    <MenuItem value="table">Table</MenuItem>
                    <MenuItem value="csv">CSV (Download)</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
            
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="filters-content"
                id="filters-header"
              >
                <Typography variant="h6">Filters</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {reportType === 'inventory' && (
                  <>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel id="location-filter-label">Location</InputLabel>
                      <Select
                        labelId="location-filter-label"
                        id="location-filter"
                        value={filters.location}
                        label="Location"
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                      >
                        <MenuItem value="">All Locations</MenuItem>
                        {locations.map((location) => (
                          <MenuItem key={location._id} value={location._id}>
                            {location.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel id="category-filter-label">Category</InputLabel>
                      <Select
                        labelId="category-filter-label"
                        id="category-filter"
                        value={filters.category}
                        label="Category"
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                      >
                        <MenuItem value="">All Categories</MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category._id} value={category._id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel id="label-filter-label">Label</InputLabel>
                      <Select
                        labelId="label-filter-label"
                        id="label-filter"
                        value={filters.label}
                        label="Label"
                        onChange={(e) => handleFilterChange('label', e.target.value)}
                      >
                        <MenuItem value="">All Labels</MenuItem>
                        {labels.map((label) => (
                          <MenuItem key={label._id} value={label._id}>
                            {label.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filters.archived}
                          onChange={(e) => handleFilterChange('archived', e.target.checked)}
                        />
                      }
                      label="Include Archived Items"
                    />
                    
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Purchase Date Range
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="From"
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="To"
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </>
                )}
                
                {(reportType === 'value' || reportType === 'location') && (
                  <Typography variant="body2" color="text.secondary">
                    No additional filters available for this report type.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
            
            {reportType === 'inventory' && (
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="columns-content"
                  id="columns-header"
                >
                  <Typography variant="h6">Columns</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.name}
                          onChange={() => handleColumnChange('name')}
                        />
                      }
                      label="Name"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.assetId}
                          onChange={() => handleColumnChange('assetId')}
                        />
                      }
                      label="Asset ID"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.location}
                          onChange={() => handleColumnChange('location')}
                        />
                      }
                      label="Location"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.category}
                          onChange={() => handleColumnChange('category')}
                        />
                      }
                      label="Category"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.labels}
                          onChange={() => handleColumnChange('labels')}
                        />
                      }
                      label="Labels"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.quantity}
                          onChange={() => handleColumnChange('quantity')}
                        />
                      }
                      label="Quantity"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.value}
                          onChange={() => handleColumnChange('value')}
                        />
                      }
                      label="Value"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.purchaseDate}
                          onChange={() => handleColumnChange('purchaseDate')}
                        />
                      }
                      label="Purchase Date"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={columns.warrantyExpires}
                          onChange={() => handleColumnChange('warrantyExpires')}
                        />
                      }
                      label="Warranty Expires"
                    />
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={generating ? <CircularProgress size={24} color="inherit" /> : <ReportIcon />}
                onClick={generateReport}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
              
              {reportData.length > 0 && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadReport}
                  sx={{ mt: 2 }}
                >
                  Download CSV
                </Button>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Report Results
              </Typography>
              
              {reportData.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {reportData.length} {reportData.length === 1 ? 'result' : 'results'}
                </Typography>
              )}
            </Box>
            
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ 
                minHeight: 400,
                maxHeight: 600,
                overflowX: 'auto',
                overflowY: 'auto'
              }}
            >
              {renderReportTable()}
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Reports;
