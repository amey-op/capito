import json

l7_glossary_i18n = {
  "term.tax.simple": "Money paid to the government to fund public services.",
  "term.tax.life": "Just like society fees pay for the building watchman, taxes pay for national roads and schools.",
  "term.tax.real": "Tax (Direct and Indirect)",
  "term.gst.simple": "A tax you pay when you buy goods or services.",
  "term.gst.life": "When you buy a ₹10,000 phone, you also pay GST on top of the price.",
  "term.gst.real": "Goods and Services Tax",
  "term.pan.simple": "A 10-digit number used to track your taxes.",
  "term.pan.life": "You need a PAN card to open a bank account or file taxes.",
  "term.pan.real": "Permanent Account Number",
  "term.slab.simple": "Income tax rates that increase in steps as your income grows.",
  "term.slab.life": "If you earn ₹4 lakh, you pay 0% tax. If you earn ₹6 lakh, you pay 5% only on the extra ₹2 lakh.",
  "term.slab.real": "Tax Slab",
  "term.tds.simple": "Tax deducted by the person paying you, before you get the money.",
  "term.tds.life": "Your boss deducts a portion of your salary and pays it directly to the government.",
  "term.tds.real": "Tax Deducted at Source"
}
with open("src/content/i18n/en/glossary-level7.json", "w") as f: json.dump(l7_glossary_i18n, f, indent=2)

l8_glossary_i18n = {
  "term.phishing.simple": "Fake messages designed to steal your passwords.",
  "term.phishing.life": "A text saying your account is blocked with a link to a fake login page.",
  "term.phishing.real": "Phishing",
  "term.socialEngineering.simple": "Tricking someone into giving away secret information.",
  "term.socialEngineering.life": "A scammer pretends to be your bank manager and scares you into sharing an OTP.",
  "term.socialEngineering.real": "Social Engineering",
  "term.ponziScheme.simple": "A scam that pays early investors with money from new investors.",
  "term.ponziScheme.life": "An app promises to double your money in 10 days, but only pays if you recruit 5 friends.",
  "term.ponziScheme.real": "Ponzi Scheme",
  "term.mlm.simple": "A system where you make money mostly by recruiting others, rather than selling products.",
  "term.mlm.life": "You pay a fee to join, and are told to hire your relatives to make your money back.",
  "term.mlm.real": "Multi-Level Marketing (MLM)",
  "term.registeredIntermediary.simple": "A company officially approved by the government to handle investments.",
  "term.registeredIntermediary.life": "A real stock broker is registered with SEBI. A random Telegram tipster is not.",
  "term.registeredIntermediary.real": "Registered Intermediary",
  "term.guaranteedReturns.simple": "A promise that an investment will make a fixed profit.",
  "term.guaranteedReturns.life": "Stock markets go up and down. Anyone promising 'guaranteed 20% returns' is lying.",
  "term.guaranteedReturns.real": "Guaranteed Returns",
  "term.cybercrime1930.simple": "The national helpline for reporting financial cybercrime.",
  "term.cybercrime1930.life": "If you get scammed, dialing 1930 immediately can freeze the stolen money.",
  "term.cybercrime1930.real": "Cybercrime Helpline 1930"
}
with open("src/content/i18n/en/glossary-level8.json", "w") as f: json.dump(l8_glossary_i18n, f, indent=2)

