const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');
const axios = require('axios'); // Import axios for making HTTP requests

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  'https://lxcurmtuzlwxszbutxhk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Y3VybXR1emx3eHN6YnV0eGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA0NDk1ODksImV4cCI6MjAzNjAyNTU4OX0.RtHEpLhoDZ_jtv3K46vcogreTyXe3YWTHec0aiq76oM'
);

// Initialize Hugging Face Inference client
const hf = new HfInference('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', axios); // Use axios for HTTP requests

// Fetch chat data from Supabase based on game name
async function fetchChatData(gameName) {
  try {
    const { data, error } = await supabase
      .from('robotai_chatdata')
      .select('*')
      .eq('game_name', gameName);

    if (error) {
      throw new Error(`Error fetching data: ${error.message}`);
    }

    console.log('Fetched Data:', data); // Log the fetched data
    return data;
  } catch (error) {
    console.error(`Error in fetchChatData: ${error.stack}`);
    throw error; // Re-throw to handle it further up if necessary
  }
}

async function askAI(gameName, question) {
  try {
    const chatData = await fetchChatData(gameName);

    if (chatData.length === 0) {
      return { answer: 'No relevant data found in the database.', score: null };
    }

    const context = chatData.map(row => `${row.question}: ${row.answer}`).join('\n');
    console.log('Context:', context); // Log the context

    const response = await hf.questionAnswering({
      model: 'google-bert/bert-large-uncased-whole-word-masking-finetuned-squad',
      inputs: {
        question: question,
        context: context
      }
    });

    console.log('AI Response:', response); // Log the AI response

    const answer = "RObot: " + response.answer.trim();
    const score = response.score; // Retrieve the confidence score from the response

    if (score < 0.4) {
      return { answer: "No answer to your question was found. Please try again or talk to a support agent!", score };
    }

    return { answer, score };
  } catch (error) {
    console.error(`Error in askAI: ${error.stack}`);
    throw error; // Re-throw to handle it further up if necessary
  }
}
async function askAIGPT(gameName, question) {
  try {
    // Generate a response using the text generation model
    const response = await hf.textGeneration({
      model: 'microsoft/Phi-3-mini-4k-instruct',
      inputs: question, // Directly use the question as the input
      parameters: {
        max_length: 500, // Adjust based on desired response length
        temperature: 0.7, // Adjust for creativity vs. determinism
      }
    });

    console.log('AI Response:', response); // Log the AI response

    const answer = "roGPT: " + response.generated_text.trim();
    return { answer }; // Return the generated answer
  } catch (error) {
    console.error(`Error in askAI: ${error.stack}`);
    throw error; // Re-throw to handle it further up if necessary
  }
}

// API endpoint to handle POST requests
app.post('/askgpt', async (req, res) => {
  const { gameName, question } = req.body;

  if (!gameName || !question) {
    return res.status(400).json({ error: 'Both gameName and question are required.' });
  }

  try {
    const { answer, score } = await askAIGPT(gameName, question);
    console.log('Final Answer:', answer); // Log the final answer
    res.json({ answer, score });
  } catch (error) {
    console.error(`Error in /ask endpoint: ${error.stack}`);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});
// API endpoint to handle POST requests
app.post('/ask', async (req, res) => {
  const { gameName, question } = req.body;

  if (!gameName || !question) {
    return res.status(400).json({ error: 'Both gameName and question are required.' });
  }

  try {
    const { answer, score } = await askAI(gameName, question);
    console.log('Final Answer:', answer); // Log the final answer
    res.json({ answer, score });
  } catch (error) {
    console.error(`Error in /ask endpoint: ${error.stack}`);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
