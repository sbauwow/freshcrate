/**
 * Mini Crates Glossary — key terms referenced across the curriculum.
 * Each entry links back to the crate where the term is first introduced.
 */

export interface GlossaryEntry {
  term: string;
  definition: string;
  crate: string;   // slug of the crate where the term is introduced
}

export const glossary: GlossaryEntry[] = [
  { term: "Artificial Intelligence (AI)", definition: "A human-made system that can learn, reason, and solve problems. Not one single invention — more like a toolbox of techniques.", crate: "what-is-ai" },
  { term: "Narrow AI", definition: "AI that excels at one specific task (like playing chess or recognizing faces) but can't generalize to other tasks. All current AI is narrow.", crate: "what-is-ai" },
  { term: "AGI (Artificial General Intelligence)", definition: "Hypothetical AI that can learn and perform any intellectual task a human can. Does not exist yet.", crate: "agents-and-the-future" },
  { term: "Hallucination", definition: "When an AI model confidently generates information that sounds plausible but is factually incorrect.", crate: "what-is-ai" },
  { term: "Turing Test", definition: "A test proposed by Alan Turing: if a human can't tell whether they're chatting with a machine or a person, the machine passes.", crate: "what-is-ai" },
  { term: "Machine Learning (ML)", definition: "A subset of AI where computers learn rules from data rather than being explicitly programmed.", crate: "how-machines-learn" },
  { term: "Supervised Learning", definition: "Training a model with both inputs (questions) and correct outputs (answers). The most common form of ML.", crate: "how-machines-learn" },
  { term: "Unsupervised Learning", definition: "Training a model with data but no labels. The model discovers patterns and groups on its own.", crate: "how-machines-learn" },
  { term: "Reinforcement Learning", definition: "Learning by trial and error. The agent takes actions, receives rewards or penalties, and adjusts its strategy.", crate: "how-machines-learn" },
  { term: "Parameters / Weights", definition: "The millions (or billions) of numbers inside a model that get adjusted during training. They encode what the model has learned.", crate: "how-machines-learn" },
  { term: "Training Data", definition: "The examples fed to a model during training. Quality and diversity of this data directly determine model performance.", crate: "data-the-fuel" },
  { term: "Bias (in data)", definition: "When training data over-represents or under-represents certain groups, leading the model to perform unevenly.", crate: "data-the-fuel" },
  { term: "Synthetic Data", definition: "Artificially generated data that mimics real data. Used to augment limited real datasets.", crate: "data-the-fuel" },
  { term: "Neural Network", definition: "A model architecture inspired by biological neurons. Layers of simple mathematical units that collectively learn complex patterns.", crate: "neural-networks" },
  { term: "Deep Learning", definition: "Neural networks with many hidden layers. 'Deep' refers to the layer count, not philosophical depth.", crate: "neural-networks" },
  { term: "Backpropagation", definition: "The algorithm for training neural networks — calculates error, works backwards through layers, and adjusts weights to reduce future errors.", crate: "neural-networks" },
  { term: "Overfitting", definition: "When a model memorizes training data (including noise) instead of learning general patterns. Performs well on training data, poorly on new data.", crate: "training-your-own" },
  { term: "Underfitting", definition: "When a model is too simple to capture the patterns in the data.", crate: "training-your-own" },
  { term: "Learning Rate", definition: "How much weights are adjusted on each training step. Too high = overshooting. Too low = painfully slow convergence.", crate: "neural-networks" },
  { term: "CNN (Convolutional Neural Network)", definition: "A neural network designed for images. Slides small filters across the image to detect patterns at increasing levels of complexity.", crate: "computer-vision" },
  { term: "Computer Vision", definition: "The field of making computers understand images and video — classification, detection, segmentation, and generation.", crate: "computer-vision" },
  { term: "Object Detection", definition: "Identifying what objects are in an image AND where each one is located (bounding boxes).", crate: "computer-vision" },
  { term: "NLP (Natural Language Processing)", definition: "The field of making computers understand, generate, and work with human language.", crate: "nlp-language" },
  { term: "Transformer", definition: "The dominant neural network architecture for language (and increasingly other domains). Uses 'attention' to learn which parts of the input are relevant to each other.", crate: "nlp-language" },
  { term: "Attention Mechanism", definition: "The key innovation in Transformers — lets the model learn which words (or tokens) to focus on when processing each part of the input.", crate: "nlp-language" },
  { term: "LLM (Large Language Model)", definition: "A massive transformer trained on internet-scale text to predict the next word. At scale, this produces surprisingly general capabilities.", crate: "nlp-language" },
  { term: "Word Embeddings", definition: "Representing words as lists of numbers (vectors) where similar words have similar vectors. Enables math on language: King - Man + Woman = Queen.", crate: "nlp-language" },
  { term: "Diffusion Model", definition: "A generative model that learns to remove noise from images. Generation starts with random noise and progressively denoises it into a coherent image.", crate: "generative-ai" },
  { term: "GAN (Generative Adversarial Network)", definition: "Two networks competing: a generator creates fakes, a discriminator detects them. They improve by training against each other.", crate: "generative-ai" },
  { term: "Deepfake", definition: "AI-generated fake video or audio depicting real people saying or doing things they never did.", crate: "ai-ethics" },
  { term: "AI Agent", definition: "An AI system that can take autonomous actions in the world using tools, not just generate text. Follows an observe-think-act loop.", crate: "agents-and-the-future" },
  { term: "ReAct Pattern", definition: "Reason + Act — the core agent loop: observe the situation, reason about what to do (using an LLM), take an action (using a tool), observe the result, repeat.", crate: "agents-and-the-future" },
  { term: "Tool Use", definition: "Giving an AI access to external tools (browser, code runner, APIs) so it can do real work beyond generating text.", crate: "agents-and-the-future" },
  { term: "Temperature", definition: "A setting that controls randomness in AI output. Higher temperature = more creative/random. Lower = more deterministic/focused.", crate: "nlp-language" },
];

export function getGlossary(): GlossaryEntry[] {
  return glossary.sort((a, b) => a.term.localeCompare(b.term));
}
