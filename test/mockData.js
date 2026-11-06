/**
 * Test Mock Data for Leads and HTML Responses
 */

const sampleLeads = [
  {
    name: 'Bella Pasta Trattoria',
    phone: '+92 51 2854321',
    address: 'Sector F-7/2, Islamabad',
    category: 'Italian Restaurant',
    rating: 4.6,
    reviewCount: 142,
    website: 'http://bellapasta-test-fake.pk',
    googleMapsUrl: 'https://maps.google.com/?cid=12345678'
  },
  {
    name: 'Khan Grill & Barbeque',
    phone: '+92 300 1234567',
    address: 'Saddar, Rawalpindi',
    category: 'Barbecue Restaurant',
    rating: 4.8,
    reviewCount: 89,
    website: '', // No website!
    googleMapsUrl: 'https://maps.google.com/?cid=87654321'
  },
  {
    name: 'Capital Dental Care',
    phone: '+92 51 8887766',
    address: 'Blue Area, Islamabad',
    category: 'Dental Clinic',
    rating: 3.9,
    reviewCount: 8, // Low reviews (< 15)
    website: 'https://capitaldental-fake.com',
    googleMapsUrl: 'https://maps.google.com/?cid=11223344'
  }
];

const mockHtmlSamples = {
  // Missing SEO tags, no mobile viewport, no chat
  unoptimizedSite: `
    <!DOCTYPE html>
    <html>
      <head>
        <!-- No Title, No Meta Description, No Viewport -->
      </head>
      <body>
        <h1>Welcome to Bella Pasta</h1>
        <p>Serving traditional recipes since 2012.</p>
      </body>
    </html>
  `,

  // Modern e-commerce site with Shopify, WhatsApp, Socials, Email, and full SEO
  modernEcommerceSite: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Gourmet Sweets & Delights | Artisanal Bakery Islamabad</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="Order fresh cakes, artisanal pastries, and gourmet sweets online with same day delivery in Islamabad.">
        <script src="https://cdn.shopify.com/s/files/theme.js"></script>
      </head>
      <body>
        <div class="site-wrapper">
          <a href="https://wa.me/923001234567">Chat with us on WhatsApp</a>
          <a href="mailto:orders@gourmet-sweets.com">Contact our baking team</a>
          <a href="https://www.facebook.com/gourmetsweetsisb">Facebook</a>
          <a href="https://instagram.com/gourmetsweets_official">Instagram</a>
          <a href="https://linkedin.com/company/gourmet-sweets-pk">LinkedIn</a>
          <a href="https://twitter.com/gourmet_pk">Twitter</a>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      </body>
    </html>
  `
};

module.exports = {
  sampleLeads,
  mockHtmlSamples
};

