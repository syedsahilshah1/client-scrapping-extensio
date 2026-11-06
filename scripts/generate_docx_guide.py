"""
Generates a comprehensive Word (.docx) Guide for LeadPulse AI Monetization & Publishing.
"""

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_guide():
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(11)
    style_normal.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)

    # Document Header / Title
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run_title = title.add_run("LeadPulse AI ⚡\nComplete Commercialization & Publishing Blueprint")
    run_title.font.name = 'Arial'
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x31, 0x2E, 0x81) # Deep Indigo

    subtitle = doc.add_paragraph()
    run_sub = subtitle.add_run("How to Accept Paid Subscriptions, Set Up Gumroad / Lemon Squeezy License Keys, and Publish to the Google Chrome Web Store")
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

    doc.add_paragraph() # Spacing

    # Callout Box: Summary
    table_callout = doc.add_table(rows=1, cols=1)
    table_callout.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_callout = table_callout.rows[0].cells[0]
    set_cell_background(cell_callout, "EEF2FF")
    set_cell_margins(cell_callout, top=140, bottom=140, left=200, right=200)
    p_box = cell_callout.paragraphs[0]
    r_box_title = p_box.add_run("📌 Document Purpose & Overview\n")
    r_box_title.bold = True
    r_box_title.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)
    p_box.add_run(
        "This guide contains the exact, step-by-step instructions for monetizing your LeadPulse AI Chrome Extension. "
        "It covers choosing a payment provider, creating digital products with automatic license keys, "
        "connecting the payment link to your codebase, and submitting your extension to the official Google Chrome Web Store."
    )

    doc.add_paragraph()

    # Section 1: Monetization Strategy
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. Business Model & Pricing Strategy")
    r_h1.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p1 = doc.add_paragraph(
        "B2B lead generation tools are among the highest-converting micro-SaaS extensions because marketing agencies, "
        "freelancers, and sales teams directly generate revenue from the prospects they discover. "
        "The most effective approach is the Freemium Model:"
    )

    doc.add_paragraph("• Free Tier (The Hook):", style='List Bullet').runs[0].bold = True
    p_free = doc.add_paragraph(
        "Allows up to 25 leads per search. Gives potential buyers a frictionless opportunity to test the extension, "
        "witness the speed of Google Maps scraping, and review the quality of the tech stack audit. Once they hit 25 leads, "
        "the built-in paywall prompts them to upgrade."
    )
    p_free.paragraph_format.left_indent = Inches(0.25)

    doc.add_paragraph("• Pro Tier ($19 - $29/Month OR $79 - $99 Lifetime):", style='List Bullet').runs[0].bold = True
    p_pro = doc.add_paragraph(
        "Unlocks unlimited leads per scan (50, 100, 250+ leads), deep social media extraction (Facebook, Instagram, "
        "LinkedIn, Twitter/X, TikTok, YouTube), verified company email scraping, automated cold pitches, "
        "and 1-click Google Sheets Live Sync."
    )
    p_pro.paragraph_format.left_indent = Inches(0.25)

    doc.add_paragraph()

    # Section 2: Step-by-Step Payment Setup (Gumroad)
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("2. Payment Provider Setup (Gumroad - 3 Minutes)")
    r_h2.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "Gumroad is recommended as the fastest merchant of record. It requires zero coding, charges no monthly fees "
        "(only a ~10% standard fee per sale), accepts international credit cards and PayPal, and automatically issues "
        "unique license keys to your customers upon checkout."
    )

    steps = [
        ("Step 1: Sign Up for Gumroad", "Visit https://gumroad.com and create a free account. Navigate to Settings > Payouts to link your bank account or PayPal email."),
        ("Step 2: Create Your Product", "Go to Products > New Product. Choose 'Digital Product', set the name to 'LeadPulse AI Pro - Google Maps Lead Scraper', and choose your pricing (e.g. $19/month subscription or $79 lifetime access)."),
        ("Step 3: Enable License Key Generation", "Under the product customization settings, toggle ON the checkbox labeled 'Generate a unique license key per sale'. This tells Gumroad to generate keys like 'LP-PRO-XXXX-XXXX'."),
        ("Step 4: Copy Your Checkout Link", "Click Publish. Copy your product link (for example: https://yourusername.gumroad.com/l/leadpulse-pro).")
    ]

    for title_text, desc_text in steps:
        p_step = doc.add_paragraph()
        r_step_num = p_step.add_run(f"✔ {title_text}: ")
        r_step_num.bold = True
        r_step_num.font.color.rgb = RGBColor(0x06, 0x5F, 0x46)
        p_step.add_run(desc_text)

    doc.add_paragraph()

    # Section 3: Codebase Integration
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("3. Connecting Your Payment Link in Code")
    r_h3.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph("Once you have your Gumroad or Lemon Squeezy product URL, update the following two locations in your extension codebase:")

    # Table of Files
    table_files = doc.add_table(rows=3, cols=2)
    table_files.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table_files.rows[0].cells
    hdr_cells[0].text = "File Path & Line"
    hdr_cells[1].text = "Code Change Required"
    for cell in hdr_cells:
        set_cell_background(cell, "1E293B")
        for p in cell.paragraphs:
            for r in p.runs:
                r.font.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    row1 = table_files.rows[1].cells
    row1[0].text = "background/licenseManager.js\n(Line 8)"
    row1[1].text = "CHECKOUT_URL: 'https://yourname.gumroad.com/l/leadpulse-pro',"
    set_cell_background(row1[0], "F8FAFC")
    set_cell_background(row1[1], "F8FAFC")

    row2 = table_files.rows[2].cells
    row2[0].text = "popup/popup.html\n(Line 279)"
    row2[1].text = '<a id="link-checkout-pro" href="https://yourname.gumroad.com/l/leadpulse-pro" target="_blank" ...>'
    set_cell_background(row2[0], "FFFFFF")
    set_cell_background(row2[1], "FFFFFF")

    doc.add_paragraph()

    # Section 4: Testing & Demo Keys
    h4 = doc.add_heading(level=1)
    r_h4 = h4.add_run("4. Testing the License System Locally")
    r_h4.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph("You can test the entire upgrade experience right now before launching payments:")
    test_steps = [
        "Open Chrome and navigate to chrome://extensions.",
        "Click the Reload (🔄) icon on LeadPulse AI.",
        "Open the LeadPulse AI popup. Notice the 'FREE (25)' pill and the '⚡ Upgrade' button in the top header.",
        "Click '⚡ Upgrade' to open the modal dialog.",
        "Click on the demo key PRO-VIP-2026 (or type it into the input) and click Activate.",
        "Verify that the badge instantly turns into a gold 'PRO ⭐' badge, removing the 25-lead limit.",
        "To test going back to Free Tier, open the modal and click 'Deactivate'."
    ]
    for ts in test_steps:
        doc.add_paragraph(f"• {ts}", style='List Bullet')

    doc.add_paragraph()

    # Section 5: Chrome Web Store Submission
    h5 = doc.add_heading(level=1)
    r_h5 = h5.add_run("5. Chrome Web Store Publishing Checklist")
    r_h5.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph("Follow this checklist when you are ready to publish to millions of Chrome users:")

    c_steps = [
        ("Step 1: Chrome Developer Account", "Visit https://chrome.google.com/webstore/devconsole and register. Google requires a one-time $5 developer registration fee."),
        ("Step 2: Prepare Your Zip File", "Zip the contents of your workspace directory. Ensure you include manifest.json, background/, content/, icons/, lib/, and popup/. Exclude node_modules, .git, and test folders."),
        ("Step 3: Store Listing Assets", "Prepare 2-3 promotional screenshots (1280 x 800 pixels) showing Google Maps with the LeadPulse AI Floating HUD and an exported Excel sheet. Store icons (16px, 48px, 128px) are already generated in your icons/ folder."),
        ("Step 4: Privacy Policy", "Google requires a simple privacy policy stating that all web scraping and auditing happens client-side inside the user's browser, and no personal lead data is collected on external servers."),
        ("Step 5: Submit for Review", "Upload your zip file in the developer console, fill in the title and description, and click 'Submit for Review'. Google typically approves extensions within 1 to 3 business days.")
    ]

    for title_text, desc_text in c_steps:
        p_c = doc.add_paragraph()
        r_c_num = p_c.add_run(f"📦 {title_text}: ")
        r_c_num.bold = True
        r_c_num.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)
        p_c.add_run(desc_text)

    doc.add_paragraph()

    # Section 6: Data Schema Reference
    h6 = doc.add_heading(level=1)
    r_h6 = h6.add_run("6. Data Schema & Google Sheet Alignment Reference")
    r_h6.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    doc.add_paragraph(
        "LeadPulse AI formats all exports (Excel, CSV, Apps Script Importer, Live Sync, and Ctrl+V clipboard) "
        "to match your exact sheet layout across the first 13 columns:"
    )

    doc.add_paragraph(
        "Columns 1 to 13 (Your Core Headers):\n"
        "1. Timestamp | 2. Niche / Category | 3. Location / Address | 4. Business Name | "
        "5. Phone | 6. Email | 7. CMS / Tech | 8. Rating | 9. Reviews | 10. Website | "
        "11. Lead Status | 12. Detailed Remarks | 13. Source Link"
    )

    doc.add_paragraph(
        "Columns 14 to 25 (Extended Agency Intelligence):\n"
        "14. Facebook URL | 15. Instagram URL | 16. LinkedIn URL | 17. Twitter / X URL | "
        "18. YouTube URL | 19. TikTok URL | 20. SSL Security | 21. Mobile Friendly | "
        "22. Missing Details & Gaps | 23. Services We Offer (Agency Upsell) | "
        "24. Tailored Outreach Pitch | 25. Lead Score Points"
    )

    # Save document
    output_path = "LeadPulse_AI_Monetization_and_Publishing_Guide.docx"
    doc.save(output_path)
    print(f"Document created successfully: {output_path}")

if __name__ == "__main__":
    create_guide()

