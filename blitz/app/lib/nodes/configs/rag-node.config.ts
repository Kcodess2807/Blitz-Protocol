import { RAGConfig } from '@/app/lib/types/workflow';

/**
 * Configuration definition for RAG (Retrieval-Augmented Generation) Node
 * This node retrieves relevant context from the knowledge base and generates answers
 */

export interface NodeConfigField {
  name: keyof RAGConfig;
  label: string;
  type: 'text' | 'password' | 'select' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  description?: string;
  helpText?: string;
  options?: Array<{
    value: string;
    label: string;
    group?: string;
  }>;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    custom?: (value: string | number) => string | null;
  };
}

export interface NodeConfigSection {
  title: string;
  description?: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

export interface NodeConfigDefinition {
  nodeType: 'rag';
  title: string;
  sections: NodeConfigSection[];
  fields: NodeConfigField[];
  validate: (config: Partial<RAGConfig>) => { valid: boolean; errors: string[] };
  getDefaultConfig: () => RAGConfig;
  isConfigured: (config: Partial<RAGConfig>) => boolean;
}

export const ragNodeConfig: NodeConfigDefinition = {
  nodeType: 'rag',
  title: 'RAG Module Configuration',
  
  sections: [
    {
      title: 'Document Management',
      description: 'Upload documents or paste text to build your knowledge base. The RAG module will use this information to answer queries.',
      type: 'info',
    },
    {
      title: 'Retrieval Settings',
      description: 'Configure how the RAG module searches and retrieves information.',
      type: 'info',
    },
  ],

  fields: [
    {
      name: 'documentMode',
      label: 'Input Mode',
      type: 'select',
      required: true,
      description: 'Choose how to provide knowledge base content.',
      options: [
        { value: 'existing', label: 'Use Existing Knowledge Base' },
        { value: 'upload', label: 'Upload Documents (.txt, .pdf)' },
        { value: 'paste', label: 'Paste Text Directly' },
      ],
    },
    {
      name: 'documentContent',
      label: 'Document Content',
      type: 'textarea',
      required: false,
      placeholder: 'Paste your company policies, FAQs, or other information here...',
      description: 'Paste text content directly (only for "Paste Text" mode).',
      helpText: 'This content will be automatically chunked and indexed.',
    },
    {
      name: 'category',
      label: 'Knowledge Category',
      type: 'select',
      required: false,
      description: 'Filter knowledge base by category. Leave empty to search all categories.',
      helpText: 'Optional: Narrow down search to specific policy types',
      options: [
        { value: '', label: 'All Categories' },
        { value: 'cancellation-policy', label: 'Cancellation Policy' },
        { value: 'shipping-policy', label: 'Shipping Policy' },
        { value: 'return-policy', label: 'Return Policy' },
        { value: 'tracking-info', label: 'Tracking Information' },
        { value: 'company-info', label: 'Company Information' },
        { value: 'product-info', label: 'Product Information' },
        { value: 'payment-info', label: 'Payment Information' },
        { value: 'faq', label: 'FAQ' },
      ],
    },
    {
      name: 'matchThreshold',
      label: 'Match Threshold',
      type: 'number',
      required: false,
      placeholder: '0.7',
      description: 'Minimum similarity score (0-1) for retrieved content. Higher = more strict.',
      helpText: 'Default: 0.7 (70% similarity)',
      validation: {
        min: 0,
        max: 1,
        custom: (value: string | number) => {
          const num = typeof value === 'string' ? parseFloat(value) : value;
          if (isNaN(num)) return 'Must be a number';
          if (num < 0 || num > 1) return 'Must be between 0 and 1';
          return null;
        },
      },
    },
    {
      name: 'matchCount',
      label: 'Max Results',
      type: 'number',
      required: false,
      placeholder: '3',
      description: 'Maximum number of relevant chunks to retrieve.',
      helpText: 'Default: 3 chunks',
      validation: {
        min: 1,
        max: 10,
        custom: (value: string | number) => {
          const num = typeof value === 'string' ? parseInt(value) : value;
          if (isNaN(num)) return 'Must be a number';
          if (num < 1 || num > 10) return 'Must be between 1 and 10';
          return null;
        },
      },
    },
    {
      name: 'responseMode',
      label: 'Response Mode',
      type: 'select',
      required: true,
      description: 'How to generate the response from retrieved context.',
      options: [
        { value: 'concise', label: 'Concise Answer (2-4 lines)' },
        { value: 'detailed', label: 'Detailed Answer' },
        { value: 'raw', label: 'Raw Context (no AI generation)' },
      ],
      validation: {
        custom: (value: string | number) => {
          const validModes = ['concise', 'detailed', 'raw'];
          if (!validModes.includes(value as string)) {
            return `Invalid mode. Must be one of: ${validModes.join(', ')}`;
          }
          return null;
        },
      },
    },
    {
      name: 'fallbackMessage',
      label: 'Fallback Message',
      type: 'textarea',
      required: false,
      placeholder: 'I couldn\'t find specific information about that. Please contact support for assistance.',
      description: 'Message to show when no relevant context is found.',
      helpText: 'Optional: Custom message for no results',
    },
  ],

  validate: (config: Partial<RAGConfig>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Document mode validation
    if (!config.documentMode) {
      errors.push('Input mode is required');
    } else {
      const validModes = ['existing', 'upload', 'paste'];
      if (!validModes.includes(config.documentMode)) {
        errors.push(`Invalid input mode: "${config.documentMode}"`);
      }

      // If paste mode, content is required
      if (config.documentMode === 'paste' && !config.documentContent) {
        errors.push('Document content is required when using "Paste Text" mode');
      }

      // If upload mode, files are required
      if (config.documentMode === 'upload' && (!config.uploadedFiles || config.uploadedFiles.length === 0)) {
        errors.push('At least one file must be uploaded when using "Upload Documents" mode');
      }
    }

    // Response mode is required
    if (!config.responseMode) {
      errors.push('Response mode is required');
    } else {
      const validModes = ['concise', 'detailed', 'raw'];
      if (!validModes.includes(config.responseMode)) {
        errors.push(`Invalid response mode: "${config.responseMode}". Must be one of: ${validModes.join(', ')}`);
      }
    }

    // Validate match threshold if provided
    if (config.matchThreshold !== undefined) {
      const threshold = typeof config.matchThreshold === 'string' 
        ? parseFloat(config.matchThreshold) 
        : config.matchThreshold;
      
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        errors.push('Match threshold must be a number between 0 and 1');
      }
    }

    // Validate match count if provided
    if (config.matchCount !== undefined) {
      const count = typeof config.matchCount === 'string' 
        ? parseInt(config.matchCount) 
        : config.matchCount;
      
      if (isNaN(count) || count < 1 || count > 10) {
        errors.push('Match count must be a number between 1 and 10');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  getDefaultConfig: (): RAGConfig => {
    return {
      documentMode: 'existing',
      documentContent: '',
      uploadedFiles: [],
      category: '',
      matchThreshold: 0.7,
      matchCount: 3,
      responseMode: 'concise',
      fallbackMessage: 'I couldn\'t find specific information about that. Please contact support for assistance.',
    };
  },

  isConfigured: (config: Partial<RAGConfig>): boolean => {
    // Node is configured if:
    // 1. Document mode is set
    // 2. Response mode is set
    // 3. If paste mode, content is provided
    // 4. If upload mode, files are provided
    
    if (!config.documentMode || !config.responseMode) {
      return false;
    }

    if (config.documentMode === 'paste' && !config.documentContent) {
      return false;
    }

    if (config.documentMode === 'upload' && (!config.uploadedFiles || config.uploadedFiles.length === 0)) {
      return false;
    }

    return true;
  },
};

/**
 * Helper function to get field by name
 */
export function getRAGField(name: keyof RAGConfig): NodeConfigField | undefined {
  return ragNodeConfig.fields.find((field) => field.name === name);
}

/**
 * Helper function to get response mode label
 */
export function getResponseModeLabel(mode: string): string {
  const modeField = ragNodeConfig.fields.find((f) => f.name === 'responseMode');
  if (!modeField?.options) return mode;
  
  const option = modeField.options.find((opt) => opt.value === mode);
  return option?.label || mode;
}

/**
 * Helper function to get category label
 */
export function getCategoryLabel(category: string): string {
  if (!category) return 'All Categories';
  
  const categoryField = ragNodeConfig.fields.find((f) => f.name === 'category');
  if (!categoryField?.options) return category;
  
  const option = categoryField.options.find((opt) => opt.value === category);
  return option?.label || category;
}
