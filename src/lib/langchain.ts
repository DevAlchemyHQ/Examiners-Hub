import { OpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai/embeddings";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { RetrievalQAChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// Pre-defined responses for common questions
const preDefinedResponses = {
  "bulk validation": "To validate bulk defects, ensure each defect has a photo number and description. Click the validation button to check for errors.",
  "upload images": "To upload images, drag files to the upload area or click the upload button. Supported formats: JPG, PNG, GIF.",
  "download package": "To download your package, select images, fill in metadata (ELR, Structure Number, Date), then click download.",
  "photo numbering": "Photo numbers should be sequential (1, 2, 3) or use # for unknown numbers. Each defect must have a unique photo number.",
  "bulk defects": "Bulk defects mode allows you to create multiple defects at once. Add photo numbers and descriptions, then select matching images.",
  "grid reference": "Use the Grid tab to find OS grid references. Enter coordinates or postcodes to get accurate grid references.",
  "calculator": "The Calculator tab provides area calculations, unit conversions, and chain measurements for surveying work.",
  "faq": "Check the FAQ tab for common questions and troubleshooting guides.",
  "help": "I can help with bulk validation, image uploads, downloads, photo numbering, grid references, and calculations. What do you need help with?",
  "error": "If you're experiencing an error, try refreshing the page or clearing your browser cache. For persistent issues, check the FAQ section.",
  "subscription": "Subscription details can be found in your profile. Click the profile icon in the top right to view your subscription status.",
  "profile": "Click the profile icon in the top right to edit your profile, view subscription details, or log out.",
  "images": "The Images tab shows all uploaded images. Select images to add metadata and download packages.",
  "bulk": "The Bulk tab allows you to create bulk defects with photo numbers and descriptions.",
  "validation": "Validation checks ensure your data is complete and properly formatted before download.",
  "metadata": "Metadata includes ELR, Structure Number, and Date. This information is included in downloaded packages.",
  "download": "Downloads create ZIP files with renamed images and metadata files for your records.",
  "elr": "ELR stands for Engineering Line Reference. Enter the engineering line reference for your project.",
  "structure number": "Enter the structure number for the asset you're inspecting.",
  "date": "Enter the inspection date in DD/MM/YYYY format."
};

// Fuzzy search for pre-defined responses
const findPreDefinedResponse = (query: string): string | null => {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Exact matches
  for (const [key, response] of Object.entries(preDefinedResponses)) {
    if (normalizedQuery.includes(key.toLowerCase())) {
      return response;
    }
  }
  
  // Partial matches
  const queryWords = normalizedQuery.split(' ');
  for (const [key, response] of Object.entries(preDefinedResponses)) {
    const keyWords = key.toLowerCase().split(' ');
    const matchCount = queryWords.filter(word => 
      keyWords.some(keyWord => keyWord.includes(word) || word.includes(keyWord))
    ).length;
    
    if (matchCount >= queryWords.length * 0.6) {
      return response;
    }
  }
  
  return null;
};

// Initialize LangChain components
let langchainChain: RetrievalQAChain | null = null;
let vectorStore: Chroma | null = null;

export const initializeLangChain = async () => {
  try {
    // Initialize OpenAI (only if API key is available)
    if (process.env.OPENAI_API_KEY) {
      const model = new OpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0.7,
        maxTokens: 500,
      });
      
      const embeddings = new OpenAIEmbeddings();
      
      // Initialize vector store
      vectorStore = new Chroma(embeddings, {
        collectionName: "exametry_docs",
      });
      
      // Create retrieval chain
      langchainChain = RetrievalQAChain.fromLLM(
        model,
        vectorStore.asRetriever({ k: 3 })
      );
      
      console.log("✅ LangChain initialized successfully");
    } else {
      console.log("⚠️ OpenAI API key not found, using pre-defined responses only");
    }
  } catch (error) {
    console.error("❌ LangChain initialization failed:", error);
  }
};

export const processChatMessage = async (message: string, context?: any) => {
  try {
    // Check pre-defined responses first (FREE)
    const preDefined = findPreDefinedResponse(message);
    if (preDefined) {
      return {
        response: preDefined,
        source: 'pre-defined',
        cost: 0
      };
    }
    
    // Use LangChain for complex queries (if available)
    if (langchainChain) {
      const result = await langchainChain.call({
        query: message,
        context: context
      });
      
      return {
        response: result.text,
        source: 'ai',
        cost: 0.002 // Approximate cost per query
      };
    }
    
    // Fallback response
    return {
      response: "I'm sorry, I don't have a specific answer for that. Try asking about bulk validation, image uploads, downloads, or check the FAQ section for more help.",
      source: 'fallback',
      cost: 0
    };
    
  } catch (error) {
    console.error("Chat processing error:", error);
    return {
      response: "I'm having trouble processing your request. Please try again or check the FAQ section.",
      source: 'error',
      cost: 0
    };
  }
};

export const addDocumentToVectorStore = async (documentText: string) => {
  try {
    if (!vectorStore) {
      throw new Error("Vector store not initialized");
    }
    
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const docs = await textSplitter.createDocuments([documentText]);
    await vectorStore.addDocuments(docs);
    
    return { success: true, documents: docs.length };
  } catch (error) {
    console.error("Document addition error:", error);
    return { success: false, error: error.message };
  }
};

export { findPreDefinedResponse, preDefinedResponses }; 