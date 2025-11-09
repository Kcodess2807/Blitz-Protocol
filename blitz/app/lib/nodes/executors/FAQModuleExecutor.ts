import { ExecutionContext } from '../types/execution';

export interface FAQExecutionResult {
  method: 'MODULE_TO_FRONTEND';
  faqAnswer: {
    question: string;
    answer: string;
    category: string;
    relatedQuestions?: string[];
  };
}

// FAQ knowledge base
const FAQ_DATABASE: Array<{
  keywords: string[];
  question: string;
  answer: string;
  category: string;
  relatedQuestions: string[];
}> = [
  {
    keywords: ['shipping', 'delivery', 'how long', 'when will', 'arrive'],
    question: 'How long does shipping take?',
    answer: 'Standard shipping takes 3-5 business days within India. Express shipping (1-2 days) is available for major cities. Free shipping on orders above ₹500.',
    category: 'Shipping',
    relatedQuestions: [
      'Do you ship internationally?',
      'What are the shipping charges?',
      'Can I track my order?',
    ],
  },
  {
    keywords: ['return', 'exchange', 'policy', 'send back'],
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return policy. Items must be unused, in original packaging with tags attached. Return shipping is free for defective items. Refunds are processed within 5-7 business days.',
    category: 'Returns',
    relatedQuestions: [
      'How do I initiate a return?',
      'What items cannot be returned?',
      'When will I get my refund?',
    ],
  },
  {
    keywords: ['payment', 'pay', 'methods', 'cod', 'card', 'upi'],
    question: 'What payment methods do you accept?',
    answer: 'We accept Credit/Debit Cards, UPI, Net Banking, Wallets (Paytm, PhonePe), and Cash on Delivery (COD). COD available for orders below ₹10,000.',
    category: 'Payment',
    relatedQuestions: [
      'Is COD available?',
      'Are payments secure?',
      'Can I pay in installments?',
    ],
  },
  {
    keywords: ['warranty', 'guarantee', 'defective', 'damaged'],
    question: 'Do products come with warranty?',
    answer: 'Yes, all products come with manufacturer warranty. Electronics: 1 year, Appliances: 2 years, Industrial equipment: 3 years. We also offer extended warranty options.',
    category: 'Warranty',
    relatedQuestions: [
      'How do I claim warranty?',
      'What does warranty cover?',
      'Can I extend warranty?',
    ],
  },
  {
    keywords: ['contact', 'support', 'help', 'customer service', 'phone', 'email'],
    question: 'How can I contact customer support?',
    answer: 'Email: support@karnatakaenterprises.com | Phone: +91-80-1234-5678 (Mon-Sat, 9 AM - 6 PM) | WhatsApp: +91-98765-43210 | Live Chat: Available on website',
    category: 'Support',
    relatedQuestions: [
      'What are your business hours?',
      'Do you have a physical store?',
      'How do I track my complaint?',
    ],
  },
  {
    keywords: ['bulk', 'wholesale', 'business', 'b2b', 'corporate'],
    question: 'Do you offer bulk/wholesale pricing?',
    answer: 'Yes! We offer special pricing for bulk orders (50+ units) and corporate clients. Contact our B2B team at b2b@karnatakaenterprises.com or call +91-80-1234-5679 for quotes.',
    category: 'Business',
    relatedQuestions: [
      'What is the minimum order quantity?',
      'Do you provide invoices?',
      'Can I get credit terms?',
    ],
  },
  {
    keywords: ['cancel', 'cancellation', 'order cancel'],
    question: 'Can I cancel my order?',
    answer: 'Yes, you can cancel orders before they are shipped. Once shipped, cancellation is not possible but you can return after delivery. No cancellation charges for orders cancelled within 24 hours.',
    category: 'Orders',
    relatedQuestions: [
      'How do I cancel my order?',
      'Will I get full refund?',
      'What if order is already shipped?',
    ],
  },
];

export class FAQModuleExecutor {
  async execute(
    query: string,
    context: ExecutionContext
  ): Promise<FAQExecutionResult> {
    console.log('[FAQModuleExecutor] Processing FAQ query:', query);

    // Find best matching FAQ
    const matchedFAQ = this.findBestMatch(query);

    console.log('[FAQModuleExecutor] Matched FAQ:', matchedFAQ.question);

    return {
      method: 'MODULE_TO_FRONTEND',
      faqAnswer: {
        question: matchedFAQ.question,
        answer: matchedFAQ.answer,
        category: matchedFAQ.category,
        relatedQuestions: matchedFAQ.relatedQuestions,
      },
    };
  }

  private findBestMatch(query: string): typeof FAQ_DATABASE[0] {
    const queryLower = query.toLowerCase();
    
    // Score each FAQ based on keyword matches
    let bestMatch = FAQ_DATABASE[0];
    let bestScore = 0;

    for (const faq of FAQ_DATABASE) {
      let score = 0;
      for (const keyword of faq.keywords) {
        if (queryLower.includes(keyword)) {
          score += 1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    }

    // If no keywords matched, return first FAQ
    return bestMatch;
  }
}
