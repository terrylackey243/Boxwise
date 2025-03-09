const axios = require('axios');
const cheerio = require('cheerio');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add the stealth plugin to puppeteer
puppeteerExtra.use(StealthPlugin());

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
  try {
    // Use the Puppeteer with stealth plugin approach for all URLs
    return await scrapeProductUrlWithPuppeteer(url);
  } catch (error) {
    console.error('Error using Puppeteer scraper, falling back to basic scraper:', error);
    
    // Fall back to the basic scraper if Puppeteer fails
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
  }
};

/**
 * Scrape product information from a URL using Puppeteer headless browser with stealth plugin
 * @param {string} url - Product URL
 * @param {string} userAgent - User agent string to use for the request (optional)
 * @param {string} acceptLanguage - Accept-Language header (optional)
 * @param {string} referrer - Referer header (optional)
 * @returns {Object} - Product information
 */
const scrapeProductUrlWithPuppeteer = async (url, userAgent, acceptLanguage, referrer) => {
  // Use the provided values or defaults
  const effectiveUserAgent = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const effectiveAcceptLanguage = acceptLanguage || 'en-US,en;q=0.9';
  const effectiveReferrer = referrer || 'https://www.google.com/';
  
  console.log(`Scraping URL with Puppeteer + Stealth Plugin:`);
  console.log(`- URL: ${url}`);
  console.log(`- User agent: ${effectiveUserAgent}`);
  
  let browser;
  try {
    // Launch a headless browser with enhanced anti-detection measures using puppeteer-extra with stealth plugin
    browser = await puppeteerExtra.launch({
      headless: 'new', // Use the new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-web-security', // Disable CORS to allow cross-origin requests
        '--disable-features=IsolateOrigins,site-per-process', // Disable site isolation
        '--disable-blink-features=AutomationControlled', // Hide automation
        '--disable-infobars', // Hide "Chrome is being controlled by automated software" infobar
        '--ignore-certificate-errors', // Ignore SSL errors
        '--enable-features=NetworkService,NetworkServiceInProcess', // Enable network service
        '--allow-running-insecure-content', // Allow mixed content
        '--lang=en-US,en', // Set language
        '--start-maximized', // Start maximized
        '--user-agent=' + effectiveUserAgent // Set user agent
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: true
      },
      ignoreHTTPSErrors: true, // Ignore HTTPS errors
      ignoreDefaultArgs: ['--enable-automation'] // Hide automation
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set user agent and other headers
    await page.setUserAgent(effectiveUserAgent);
    await page.setExtraHTTPHeaders({
      'Accept-Language': effectiveAcceptLanguage,
      'Referer': effectiveReferrer,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    });
    
    // Determine if we need to visit the homepage first (for sites like Walmart and Lowes)
    let needsHomepageVisit = url.includes('walmart.com') || url.includes('lowes.com');
    
    if (needsHomepageVisit) {
      // Extract the domain
      const domain = extractDomain(url);
      const homepageUrl = `https://www.${domain}`;
      
      console.log(`First visiting homepage: ${homepageUrl} to establish session...`);
      
      // Visit the homepage
      await page.goto(homepageUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 // 60 seconds timeout
      });
      
      // Add a random delay to simulate human browsing (2-5 seconds)
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 2000));
      
      console.log(`Session established. Proceeding to product page...`);
    }
    
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 // 60 seconds timeout
    });
    
    // Wait for the page to fully load
    await page.waitForTimeout(2000);
    
    // Check if we hit a CAPTCHA or robot check
    const pageContent = await page.content();
    if (
      pageContent.toLowerCase().includes('captcha') || 
      pageContent.toLowerCase().includes('robot check') ||
      pageContent.toLowerCase().includes('human verification')
    ) {
      throw new Error('Captcha or robot check detected. The website is actively blocking automated access.');
    }
    
    // Extract product information based on the website
    let productData;
    
    if (url.includes('amazon.com')) {
      productData = await extractAmazonProductDataWithPuppeteer(page);
    } else if (url.includes('walmart.com')) {
      productData = await extractWalmartProductDataWithPuppeteer(page);
    } else if (url.includes('lowes.com')) {
      productData = await extractLowesProductDataWithPuppeteer(page);
    } else if (url.includes('bestbuy.com')) {
      productData = await extractBestBuyProductDataWithPuppeteer(page);
    } else {
      productData = await extractGenericProductDataWithPuppeteer(page);
    }
    
    // Add the URL to the product data
    productData.itemUrl = url;
    
    return productData;
  } catch (error) {
    console.error('Error in Puppeteer scraping:', error);
    throw error;
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Extract domain from URL
 * @param {string} url - The URL
 * @returns {string} - Domain
 */
const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return url.split('/')[2];
  }
};

/**
 * Extract product data from Amazon using Puppeteer
 * @param {Page} page - Puppeteer page object
 * @returns {Object} - Product information
 */
const extractAmazonProductDataWithPuppeteer = async (page) => {
  return await page.evaluate(() => {
    // Initialize product data
    const productData = {
      name: '',
      description: '',
      manufacturer: '',
      modelNumber: '',
      purchasePrice: '',
      upcCode: ''
    };
    
    // Product name
    const nameElement = document.querySelector('#productTitle');
    if (nameElement) {
      productData.name = nameElement.textContent.trim();
    }
    
    // Product description
    const descriptionElements = document.querySelectorAll('#feature-bullets .a-list-item');
    if (descriptionElements.length > 0) {
      productData.description = Array.from(descriptionElements)
        .map(el => el.textContent.trim())
        .join(' ');
    }
    
    // Manufacturer
    const manufacturerElement = document.querySelector('a#bylineInfo');
    if (manufacturerElement) {
      productData.manufacturer = manufacturerElement.textContent
        .trim()
        .replace('Visit the ', '')
        .replace(' Store', '');
    }
    
    // Price - try multiple selectors and formats
    const priceSelectors = [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#priceblock_saleprice',
      '.a-color-price',
      '.a-size-medium.a-color-price',
      '#price_inside_buybox',
      '.a-section.a-spacing-small .a-row .a-color-price',
      '#corePrice_feature_div .a-price .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen'
    ];
    
    for (const selector of priceSelectors) {
      const priceElement = document.querySelector(selector);
      if (priceElement && priceElement.textContent.trim()) {
        const priceText = priceElement.textContent.trim();
        // Extract the price using regex to handle different formats
        const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
        if (priceMatch && priceMatch[1]) {
          productData.purchasePrice = parseFloat(priceMatch[1].replace(/,/g, ''));
          break;
        }
      }
    }
    
    // If still no price, try to find it in the product details
    if (!productData.purchasePrice) {
      // Look for price in the product details section
      const priceLabels = ['price', 'list price', 'deal price', 'sale price'];
      
      for (const row of productDetails) {
        let label = '';
        let value = '';
        
        // Handle different table structures
        if (row.querySelector('.a-span3')) {
          label = row.querySelector('.a-span3').textContent.trim().toLowerCase();
          value = row.querySelector('.a-span9').textContent.trim();
        } else if (row.querySelector('th')) {
          label = row.querySelector('th').textContent.trim().toLowerCase();
          value = row.querySelector('td').textContent.trim();
        } else if (row.querySelector('.a-text-right')) {
          label = row.querySelector('.a-text-right').textContent.trim().toLowerCase();
          value = row.querySelector('.a-text-left').textContent.trim();
        } else if (row.textContent.includes(':')) {
          const parts = row.textContent.split(':');
          if (parts.length >= 2) {
            label = parts[0].trim().toLowerCase();
            value = parts[1].trim();
          }
        }
        
        // Check if this row contains price information
        for (const priceLabel of priceLabels) {
          if (label.includes(priceLabel)) {
            const priceMatch = value.match(/\$?([\d,]+\.?\d*)/);
            if (priceMatch && priceMatch[1]) {
              productData.purchasePrice = parseFloat(priceMatch[1].replace(/,/g, ''));
              break;
            }
          }
        }
        
        if (productData.purchasePrice) break;
      }
    }
    
    // Model number - check multiple fields that might contain model number
    // First check the product details table
    const productDetails = document.querySelectorAll('.a-section.a-spacing-small .a-row, #productDetails_techSpec_section_1 tr, #productDetails tr, #detailBullets_feature_div li');
    
    const modelKeywords = [
      'model number',
      'item model number',
      'model name',
      'model',
      'part number'
    ];
    
    for (const row of productDetails) {
      let label = '';
      let value = '';
      
      // Handle different table structures
      if (row.querySelector('.a-span3')) {
        // Standard Amazon product details
        label = row.querySelector('.a-span3').textContent.trim().toLowerCase();
        value = row.querySelector('.a-span9').textContent.trim();
      } else if (row.querySelector('th')) {
        // Tech specs table
        label = row.querySelector('th').textContent.trim().toLowerCase();
        value = row.querySelector('td').textContent.trim();
      } else if (row.querySelector('.a-text-right')) {
        // Another product details format
        label = row.querySelector('.a-text-right').textContent.trim().toLowerCase();
        value = row.querySelector('.a-text-left').textContent.trim();
      } else if (row.textContent.includes(':')) {
        // Detail bullets format
        const parts = row.textContent.split(':');
        if (parts.length >= 2) {
          label = parts[0].trim().toLowerCase();
          value = parts[1].trim();
        }
      }
      
      // Check if this row contains model number information
      for (const keyword of modelKeywords) {
        if (label.includes(keyword)) {
          productData.modelNumber = value;
          break;
        }
      }
      
      if (productData.modelNumber) break;
    }
    
    // If still no model number, try to find it in the product description
    if (!productData.modelNumber && productData.description) {
      const modelRegex = /model\s*(?:number|no|#)?:?\s*([a-zA-Z0-9-]+)/i;
      const modelMatch = productData.description.match(modelRegex);
      
      if (modelMatch && modelMatch[1]) {
        productData.modelNumber = modelMatch[1].trim();
      }
    }
    
    return productData;
  });
};

/**
 * Extract product data from Walmart using Puppeteer
 * @param {Page} page - Puppeteer page object
 * @returns {Object} - Product information
 */
const extractWalmartProductDataWithPuppeteer = async (page) => {
  return await page.evaluate(() => {
    // Initialize product data
    const productData = {
      name: '',
      description: '',
      manufacturer: '',
      modelNumber: '',
      purchasePrice: '',
      upcCode: ''
    };
    
    // Product name - try multiple selectors
    const nameSelectors = [
      'h1[itemprop="name"]',
      'h1.prod-ProductTitle',
      '[data-testid="product-title"]',
      '.prod-title-section h1',
      'h1.f3'
    ];
    
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        productData.name = element.textContent.trim();
        break;
      }
    }
    
    // Description - try multiple selectors
    const descriptionSelectors = [
      '[data-testid="product-description-content"]',
      '.about-product',
      '[itemprop="description"]',
      '.prod-ProductDescription',
      '[data-testid="product-description"]'
    ];
    
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        productData.description = element.textContent.trim();
        break;
      }
    }
    
    // Manufacturer/brand - try multiple selectors
    const brandSelectors = [
      '[itemprop="brand"]',
      '.prod-brandName',
      '.brand-name',
      '[data-testid="product-brand"]',
      '.b.f6'
    ];
    
    for (const selector of brandSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        productData.manufacturer = element.textContent.trim();
        break;
      }
    }
    
    // Price - try multiple selectors
    const priceSelectors = [
      '[itemprop="price"]',
      '.price-characteristic',
      '.prod-PriceSection .price-group',
      '[data-testid="price"]',
      '.f1.f3'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const priceText = element.textContent.trim().replace('$', '');
        const priceMatch = priceText.match(/[\d,.]+/);
        if (priceMatch) {
          productData.purchasePrice = parseFloat(priceMatch[0].replace(/[^0-9.]/g, ''));
          break;
        }
      }
    }
    
    // Model number - try to find in specifications
    const modelSelectors = [
      '.product-specification-table tr',
      '[data-testid="specifications"] tr',
      '.prod-SpecTable tr'
    ];
    
    for (const selector of modelSelectors) {
      const rows = document.querySelectorAll(selector);
      for (const row of rows) {
        const label = row.querySelector('td:first-child, th:first-child');
        if (label && label.textContent.trim().toLowerCase().includes('model')) {
          const value = row.querySelector('td:last-child, td:nth-child(2)');
          if (value) {
            productData.modelNumber = value.textContent.trim();
            break;
          }
        }
      }
      
      if (productData.modelNumber) break;
    }
    
    // If no model number found, try regex approach
    if (!productData.modelNumber) {
      const modelRegex = /model\s*(?:number|no|#)?:?\s*([a-zA-Z0-9-]+)/i;
      const bodyText = document.body.textContent;
      const modelMatch = bodyText.match(modelRegex);
      
      if (modelMatch && modelMatch[1]) {
        productData.modelNumber = modelMatch[1].trim();
      }
    }
    
    return productData;
  });
};

/**
 * Extract product data from Lowes using Puppeteer
 * @param {Page} page - Puppeteer page object
 * @returns {Object} - Product information
 */
const extractLowesProductDataWithPuppeteer = async (page) => {
  return await page.evaluate(() => {
    // Initialize product data
    const productData = {
      name: '',
      description: '',
      manufacturer: '',
      modelNumber: '',
      purchasePrice: '',
      upcCode: ''
    };
    
    // Product name
    const nameSelectors = [
      'h1.pdp-title',
      'h1[data-selector="pd-header-title"]'
    ];
    
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        productData.name = element.textContent.trim();
        break;
      }
    }
    
    // Description
    const descriptionSelectors = [
      '.pdp-description',
      '[data-selector="pd-description"]',
      '[data-selector="overview-text"]',
      '.product-description'
    ];
    
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        productData.description = element.textContent.trim();
        break;
      }
    }
    
    // Manufacturer
    const manufacturerSelectors = [
      '.pdp-brand-name',
      '[data-selector="pd-brand-name"]',
      '.brand-name'
    ];
    
    for (const selector of manufacturerSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        productData.manufacturer = element.textContent.trim();
        break;
      }
    }
    
    // Price
    const priceSelectors = [
      '.main-price',
      '[data-selector="price"]',
      '.product-price',
      '.price-main'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const priceText = element.textContent.trim().replace('$', '');
        const priceMatch = priceText.match(/[\d,.]+/);
        if (priceMatch) {
          productData.purchasePrice = parseFloat(priceMatch[0].replace(/[^0-9.]/g, ''));
          break;
        }
      }
    }
    
    // Model number
    const modelSelectors = [
      '.specifications-table tr',
      '[data-selector="specifications"] tr',
      '.product-specs tr'
    ];
    
    for (const selector of modelSelectors) {
      const rows = document.querySelectorAll(selector);
      for (const row of rows) {
        const label = row.querySelector('th, td:first-child');
        if (label && label.textContent.trim().toLowerCase().includes('model')) {
          const value = row.querySelector('td:last-child, td:nth-child(2)');
          if (value) {
            productData.modelNumber = value.textContent.trim();
            break;
          }
        }
      }
      
      if (productData.modelNumber) break;
    }
    
    // If no model number found, try regex approach
    if (!productData.modelNumber) {
      const modelRegex = /model\s*(?:number|no|#)?:?\s*([a-zA-Z0-9-]+)/i;
      const bodyText = document.body.textContent;
      const modelMatch = bodyText.match(modelRegex);
      
      if (modelMatch && modelMatch[1]) {
        productData.modelNumber = modelMatch[1].trim();
      }
    }
    
    return productData;
  });
};

/**
 * Extract product data from Best Buy using Puppeteer
 * @param {Page} page - Puppeteer page object
 * @returns {Object} - Product information
 */
const extractBestBuyProductDataWithPuppeteer = async (page) => {
  return await page.evaluate(() => {
    // Initialize product data
    const productData = {
      name: '',
      description: '',
      manufacturer: '',
      modelNumber: '',
      purchasePrice: '',
      upcCode: ''
    };
    
    // Product name
    const nameElement = document.querySelector('.sku-title h1');
    if (nameElement) {
      productData.name = nameElement.textContent.trim();
    }
    
    // Description
    const descriptionElement = document.querySelector('.product-description');
    if (descriptionElement) {
      productData.description = descriptionElement.textContent.trim();
    }
    
    // Manufacturer
    const manufacturerElement = document.querySelector('.brand-link');
    if (manufacturerElement) {
      productData.manufacturer = manufacturerElement.textContent.trim();
    }
    
    // Price
    const priceElement = document.querySelector('.priceView-customer-price span');
    if (priceElement) {
      const priceText = priceElement.textContent.trim().replace('$', '');
      productData.purchasePrice = parseFloat(priceText);
    }
    
    // Model number
    const specRows = document.querySelectorAll('.spec-table tr');
    for (const row of specRows) {
      const label = row.querySelector('.row-title');
      if (label && label.textContent.trim().toLowerCase().includes('model number')) {
        const value = row.querySelector('.row-value');
        if (value) {
          productData.modelNumber = value.textContent.trim();
          break;
        }
      }
    }
    
    return productData;
  });
};

/**
 * Extract product data from a generic website using Puppeteer
 * @param {Page} page - Puppeteer page object
 * @returns {Object} - Product information
 */
const extractGenericProductDataWithPuppeteer = async (page) => {
  return await page.evaluate(() => {
    // Initialize product data
    const productData = {
      name: '',
      description: '',
      manufacturer: '',
      modelNumber: '',
      purchasePrice: '',
      upcCode: ''
    };
    
    // Product name - try meta tags first, then common selectors
    const metaTitle = document.querySelector('meta[property="og:title"]') || 
                      document.querySelector('meta[name="twitter:title"]');
    
    if (metaTitle && metaTitle.getAttribute('content')) {
      productData.name = metaTitle.getAttribute('content');
    } else {
      const titleElement = document.querySelector('h1') || document.querySelector('title');
      if (titleElement) {
        productData.name = titleElement.textContent.trim();
      }
    }
    
    // Description - try meta tags first, then common selectors
    const metaDescription = document.querySelector('meta[property="og:description"]') || 
                           document.querySelector('meta[name="description"]') ||
                           document.querySelector('meta[name="twitter:description"]');
    
    if (metaDescription && metaDescription.getAttribute('content')) {
      productData.description = metaDescription.getAttribute('content');
    } else {
      const descriptionSelectors = [
        '[itemprop="description"]',
        '.product-description',
        '.description',
        '#description'
      ];
      
      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          productData.description = element.textContent.trim();
          break;
        }
      }
    }
    
    // Price - try meta tags first, then common selectors
    const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                     document.querySelector('meta[property="og:price:amount"]');
    
    if (metaPrice && metaPrice.getAttribute('content')) {
      productData.purchasePrice = parseFloat(metaPrice.getAttribute('content'));
    } else {
      const priceSelectors = [
        '[itemprop="price"]',
        '.price',
        '.product-price',
        '.offer-price',
        '.current-price',
        '.sale-price'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const priceText = element.textContent.trim();
          const priceMatch = priceText.match(/[\d,.]+/);
          if (priceMatch) {
            productData.purchasePrice = parseFloat(priceMatch[0].replace(/[^0-9.]/g, ''));
            break;
          }
        }
      }
    }
    
    // Manufacturer/brand - try meta tags first, then common selectors
    const metaBrand = document.querySelector('meta[property="product:brand"]') || 
                     document.querySelector('meta[property="og:brand"]');
    
    if (metaBrand && metaBrand.getAttribute('content')) {
      productData.manufacturer = metaBrand.getAttribute('content');
    } else {
      const brandSelectors = [
        '[itemprop="brand"]',
        '.brand',
        '.manufacturer',
        '.product-brand'
      ];
      
      for (const selector of brandSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          productData.manufacturer = element.textContent.trim();
          break;
        }
      }
    }
    
    // Model number - look for it in tables, lists, or text
    const modelKeywords = ['model', 'model number', 'model no', 'model#', 'item model'];
    
    // Check in tables
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
        const rowText = row.textContent.toLowerCase();
        for (const keyword of modelKeywords) {
          if (rowText.includes(keyword)) {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
              // Assume the model number is in the second cell
              productData.modelNumber = cells[1].textContent.trim();
              break;
            }
          }
        }
        if (productData.modelNumber) break;
      }
      if (productData.modelNumber) break;
    }
    
    // If still no model number, try regex approach
    if (!productData.modelNumber) {
      const modelRegex = /model\s*(?:number|no|#)?:?\s*([a-zA-Z0-9-]+)/i;
      const bodyText = document.body.textContent;
      const modelMatch = bodyText.match(modelRegex);
      
      if (modelMatch && modelMatch[1]) {
        productData.modelNumber = modelMatch[1].trim();
      }
    }
    
    return productData;
  });
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
