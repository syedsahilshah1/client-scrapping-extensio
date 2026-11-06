/**
 * LeadPulse AI - Excel (.xlsx) & CSV Data Exporter
 * Generates structured, professional spreadsheets directly in the browser via SheetJS.
 */

const Exporter = {
  /**
   * Formats raw lead objects into standardized export rows
   */
  prepareRows(leads = []) {
    return leads.map(lead => {
      // Format arrays/lists nicely
      const missingDetails = Array.isArray(lead.missingDetails) && lead.missingDetails.length > 0
        ? lead.missingDetails.join(' | ')
        : (Array.isArray(lead.auditFindings) ? lead.auditFindings.join('; ') : (lead.auditFindings || 'None'));

      const servicesWeOffer = Array.isArray(lead.servicesWeOffer) && lead.servicesWeOffer.length > 0
        ? lead.servicesWeOffer.join('; ')
        : (Array.isArray(lead.opportunities) ? lead.opportunities.join(', ') : (lead.opportunities || 'General Growth'));

      const opportunities = Array.isArray(lead.opportunities)
        ? lead.opportunities.join(', ')
        : (lead.opportunities || '');

      const technologies = Array.isArray(lead.technologies)
        ? lead.technologies.join(', ')
        : (lead.technologies || '');

      const sslText = !lead.hasWebsite
        ? 'No Website'
        : (lead.hasSsl ? 'Secure (HTTPS)' : 'Insecure (HTTP)');

      const mobileText = !lead.hasWebsite
        ? 'N/A'
        : (lead.isMobileFriendly ? 'Yes' : 'No');

      const chatText = lead.hasWhatsapp
        ? 'WhatsApp Detected'
        : (lead.hasChatWidget ? `Yes (${lead.chatWidgetType || 'Chatbot'})` : 'None');

      // Social URLs & Contact
      const socials = lead.socialLinks || {};
      const contact = lead.contactInfo || {};

      const timestamp = lead.scrapedAt
        ? new Date(lead.scrapedAt).toISOString().replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19);

      const email = contact.email || lead.email || (lead.hasWebsite ? '' : 'No Website');
      const website = lead.websiteUrl || lead.website || 'No Website';
      const cmsTech = technologies || (lead.hasWebsite ? 'Custom HTML/JS' : 'No Website');
      const leadStatus = lead.leadScore ? `${lead.leadScore} (${lead.leadScorePoints || 0} pts)` : 'NEW';

      const remarks = [
        lead.primaryPitch ? `🎯 ${lead.primaryPitch}` : '',
        missingDetails && missingDetails !== 'None' ? `⚠️ Missing: ${missingDetails}` : '',
        servicesWeOffer && servicesWeOffer !== 'General Growth' ? `💡 Offer: ${servicesWeOffer}` : ''
      ].filter(Boolean).join(' | ');

      return {
        // 1-13: User's Exact Sheet Headers
        'Timestamp': timestamp,
        'Niche / Category': lead.category || '',
        'Location / Address': lead.address || '',
        'Business Name': lead.name || '',
        'Phone': lead.phone || '',
        'Email': email,
        'CMS / Tech': cmsTech,
        'Rating': lead.rating !== null && lead.rating !== undefined ? lead.rating : 'N/A',
        'Reviews': lead.reviewCount || 0,
        'Website': website,
        'Lead Status': leadStatus,
        'Detailed Remarks': remarks || 'Ready for outreach',
        'Source Link': lead.googleMapsUrl || '',

        // 14+: Extended Agency Intelligence & Audit Columns
        'Facebook URL': socials.facebook || '',
        'Instagram URL': socials.instagram || '',
        'LinkedIn URL': socials.linkedin || '',
        'Twitter / X URL': socials.twitter || '',
        'YouTube URL': socials.youtube || '',
        'TikTok URL': socials.tiktok || '',
        'SSL Security': sslText,
        'Mobile Friendly': mobileText,
        'Missing Details & Gaps': missingDetails,
        'Services We Offer (Agency Upsell)': servicesWeOffer,
        'Tailored Outreach Pitch': lead.primaryPitch || '',
        'Lead Score Points': lead.leadScorePoints || 0
      };
    });
  },

  /**
   * Generates and downloads an Excel (.xlsx) file
   */
  exportToExcel(leads = [], filename = 'LeadPulse_Leads.xlsx') {
    if (!leads || leads.length === 0) {
      throw new Error('No leads to export.');
    }

    const rows = this.prepareRows(leads);

    // Verify SheetJS is loaded
    const xlsxLib = typeof XLSX !== 'undefined' ? XLSX : (typeof window !== 'undefined' ? window.XLSX : null);
    if (!xlsxLib) {
      console.warn('[LeadPulse AI] SheetJS (XLSX) not found. Falling back to CSV export.');
      return this.exportToCsv(leads, filename.replace(/\.xlsx$/i, '.csv'));
    }

    // Create workbook and worksheet
    const worksheet = xlsxLib.utils.json_to_sheet(rows);

    // Auto-compute column widths for clean readability
    const colWidths = Object.keys(rows[0] || {}).map(key => {
      let maxLen = key.length;
      rows.forEach(r => {
        const val = r[key] ? String(r[key]) : '';
        if (val.length > maxLen) {
          maxLen = Math.min(val.length, 60); // Cap width to 60 for long pitches
        }
      });
      return { wch: Math.max(maxLen + 3, 12) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = xlsxLib.utils.book_new();
    xlsxLib.utils.book_append_sheet(workbook, worksheet, 'Audited Leads');

    // Generate binary array and trigger download
    const excelBuffer = xlsxLib.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    this._downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
    return true;
  },

  /**
   * Generates and downloads a CSV file with UTF-8 BOM
   */
  exportToCsv(leads = [], filename = 'LeadPulse_Leads.csv') {
    if (!leads || leads.length === 0) {
      throw new Error('No leads to export.');
    }

    const rows = this.prepareRows(leads);
    const headers = Object.keys(rows[0] || {});

    const csvContent = [
      headers.map(h => this._escapeCsvCell(h)).join(','),
      ...rows.map(row =>
        headers.map(h => this._escapeCsvCell(row[h] !== undefined ? String(row[h]) : '')).join(',')
      )
    ].join('\r\n');

    // Add UTF-8 BOM so Excel opens international symbols correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    this._downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
    return true;
  },

  /**
   * Copies formatted TSV data to clipboard for 1-click Ctrl+V paste directly into Excel or Google Sheets
   */
  async copyToClipboard(leads = []) {
    if (!leads || leads.length === 0) {
      throw new Error('No leads to copy.');
    }

    const rows = this.prepareRows(leads);
    const headers = Object.keys(rows[0] || {});

    const tsvContent = [
      headers.join('\t'),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
          return val.replace(/[\t\r\n]+/g, ' ').trim();
        }).join('\t')
      )
    ].join('\r\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tsvContent);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = tsvContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    return true;
  },

  _escapeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  },

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
};

// Export for Node tests and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Exporter;
} else if (typeof window !== 'undefined') {
  window.Exporter = Exporter;
}

