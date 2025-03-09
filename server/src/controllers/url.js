const axios = require('axios');
const cheerio = require('cheerio');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

/**
 * @desc    Scrape product information from a URL
 * @route   GET /api/url/scrape
 * @access  Private
 */
exports.scrapeUrl = asyncHandler(async (req, res, next) => {
  const { url } = req.query;

  if (!url) {
    return next(new ErrorResponse('Please provide a URL', 400));
  }
  
  try {
    const productData = await scrapeProductUrl(url);
    
    res.status(200).json({
      success: true,
      data: productData
    });
  } catch (err) {
    console.error('Error scraping URL:', err);
    return next(new ErrorResponse('Error scraping URL. The website may be blocking our request.', 500));
  }
});

/**
 * @desc    Lookup product information from a URL (POST version)
 * @route   POST /api/url/lookup
 * @access  Private
 */
exports.lookupUrl = asyncHandler(async (req, res, next) => {
  const { url } = req.body;

  if (!url) {
    return next(new ErrorResponse('Please provide a URL', 400));
  }
  
  try {
    const productData = await scrapeProductUrl(url);
    
    res.status(200).json({
      success: true,
      data: productData
    });
  } catch (err) {
    console.error('Error looking up URL:', err);
    return next(new ErrorResponse('Error looking up URL. The website may be blocking our request.', 500));
  }
});

/**
 * Scrape product information from a URL
 * @param {string} url - Product URL
 * @returns {Object} - Product information
 */
const scrapeProductUrl = async (url) => {
  // Determine which scraper to use based on the URL
  let productData;
  
  if (url.includes('amazon.com')) {
    productData = await scrapeAmazon(url);
  } else if (url.includes('lowes.com')) {
    productData = await scrapeLowes(url);
  } else if (url.includes('bestbuy.com')) {
    productData = await scrapeBestBuy(url);
  } else {
    // Use generic scraper for other websites
    productData = await scrapeGeneric(url);
  }

  return productData;
};

/**
 * Scrape product information from Amazon
 * @param {string} url - Amazon product URL
 * @returns {Object} - Product information
 */
const scrapeAmazon = async (url) => {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  const $ = cheerio.load(response.data);
  
  // Extract product information
  const name = $('#productTitle').text().trim();
  const description = $('#feature-bullets .a-list-item').map((i, el) => $(el).text().trim()).get().join(' ');
  const manufacturer = $('a#bylineInfo').text().trim().replace('Visit the ', '').replace(' Store', '');
  const price = $('.a-price .a-offscreen').first().text().trim().replace('$', '');
  
  // Try to find model number in the product details section
  let modelNumber = '';
  $('.a-section.a-spacing-small .a-row').each((i, row) => {
    const label = $(row).find('.a-span3').text().trim();
    if (label.toLowerCase().includes('model') || label.toLowerCase().includes('item model')) {
      modelNumber = $(row).find('.a-span9').text().trim();
    }
  });

  return {
    name,
    description,
    manufacturer,
    modelNumber,
    purchasePrice: price ? parseFloat(price) : '',
    upcCode: '', // Amazon doesn't typically display UPC codes
    itemUrl: url
  };
};

/**
 * Scrape product information from Lowes
 * @param {string} url - Lowes product URL
 * @returns {Object} - Product information
 */
const scrapeLowes = async (url) => {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  const $ = cheerio.load(response.data);
  
  // Extract product information
  const name = $('h1.pdp-title').text().trim();
  const description = $('.pdp-description').text().trim();
  const manufacturer = $('.pdp-brand-name').text().trim();
  const price = $('.main-price').text().trim().replace('$', '');
  
  // Try to find model number in the specifications section
  let modelNumber = '';
  $('.specifications-table tr').each((i, row) => {
    const label = $(row).find('th').text().trim();
    if (label.toLowerCase().includes('model')) {
      modelNumber = $(row).find('td').text().trim();
    }
  });

  return {
    name,
    description,
    manufacturer,
    modelNumber,
    purchasePrice: price ? parseFloat(price) : '',
    upcCode: '', // Lowes doesn't typically display UPC codes
    itemUrl: url
  };
};

/**
 * Scrape product information from Best Buy
 * @param {string} url - Best Buy product URL
 * @returns {Object} - Product information
 */
const scrapeBestBuy = async (url) => {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  const $ = cheerio.load(response.data);
  
  // Extract product information
  const name = $('.sku-title h1').text().trim();
  const description = $('.product-description').text().trim();
  const manufacturer = $('.brand-link').text().trim();
  const price = $('.priceView-customer-price span').first().text().trim().replace('$', '');
  
  // Try to find model number in the specifications section
  let modelNumber = '';
  $('.spec-table tr').each((i, row) => {
    const label = $(row).find('.row-title').text().trim();
    if (label.toLowerCase().includes('model number')) {
      modelNumber = $(row).find('.row-value').text().trim();
    }
  });

  return {
    name,
    description,
    manufacturer,
    modelNumber,
    purchasePrice: price ? parseFloat(price) : '',
    upcCode: '', // Best Buy doesn't typically display UPC codes
    itemUrl: url
  };
};

/**
 * Generic scraper for any website
 * @param {string} url - Product URL
 * @returns {Object} - Product information
 */
const scrapeGeneric = async (url) => {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  const $ = cheerio.load(response.data);
  
  // Initialize product data
  let productData = {
    name: '',
    description: '',
    manufacturer: '',
    modelNumber: '',
    purchasePrice: '',
    upcCode: '',
    itemUrl: url
  };

  // Try to extract information from meta tags first (most reliable)
  // Product name
  productData.name = $('meta[property="og:title"]').attr('content') || 
                     $('meta[name="twitter:title"]').attr('content') || 
                     $('title').text().trim();
  
  // Product description
  productData.description = $('meta[property="og:description"]').attr('content') || 
                           $('meta[name="description"]').attr('content') || 
                           $('meta[name="twitter:description"]').attr('content');
  
  // Price (look for common price patterns)
  const priceSelectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    '.price',
    '.product-price',
    '.offer-price',
    '[itemprop="price"]',
    '.current-price',
    '.sale-price'
  ];
  
  for (const selector of priceSelectors) {
    let priceText = '';
    if (selector.startsWith('meta')) {
      priceText = $(selector).attr('content');
    } else {
      priceText = $(selector).first().text().trim();
    }
    
    if (priceText) {
      // Extract numbers from the price text
      const priceMatch = priceText.match(/[\d,.]+/);
      if (priceMatch) {
        productData.purchasePrice = parseFloat(priceMatch[0].replace(/[^0-9.]/g, ''));
        break;
      }
    }
  }
  
  // Try to find manufacturer
  const brandSelectors = [
    'meta[property="product:brand"]',
    'meta[property="og:brand"]',
    '[itemprop="brand"]',
    '.brand',
    '.manufacturer',
    '.product-brand'
  ];
  
  for (const selector of brandSelectors) {
    let brandText = '';
    if (selector.startsWith('meta')) {
      brandText = $(selector).attr('content');
    } else {
      brandText = $(selector).first().text().trim();
    }
    
    if (brandText) {
      productData.manufacturer = brandText;
      break;
    }
  }
  
  // Try to find model number
  // Look for text that might contain model number
  const modelKeywords = ['model', 'model number', 'model no', 'model#', 'item model'];
  
  // First check in structured data
  $('table tr, dl, .specifications, .product-specs').each((i, el) => {
    const rowText = $(el).text().toLowerCase();
    
    for (const keyword of modelKeywords) {
      if (rowText.includes(keyword)) {
        // Extract the model number - look for the value after the keyword
        const modelMatch = rowText.split(keyword)[1];
        if (modelMatch) {
          // Clean up the model number
          const cleanedModel = modelMatch.trim().split('\n')[0].trim();
          if (cleanedModel) {
            productData.modelNumber = cleanedModel;
            break;
          }
        }
      }
    }
  });
  
  // If we still don't have a model number, look for patterns that might be model numbers
  if (!productData.modelNumber) {
    // Look for text that matches common model number patterns
    const modelRegex = /model\s*(?:number|no|#)?:?\s*([a-zA-Z0-9-]+)/i;
    const bodyText = $('body').text();
    const modelMatch = bodyText.match(modelRegex);
    
    if (modelMatch && modelMatch[1]) {
      productData.modelNumber = modelMatch[1].trim();
    }
  }
  
  return productData;
};
