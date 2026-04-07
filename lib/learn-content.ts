/**
 * Mini Crates — AI & ML Education from Scratch
 *
 * A progressive curriculum teaching AI/ML from the ground up.
 * Target audience: curious newcomers who want real explanations.
 * Tone: direct, witty, no jargon. Respects intelligence while
 * never assuming prior knowledge.
 */

export interface MiniCrate {
  slug: string;
  number: number;
  title: string;
  emoji: string;
  subtitle: string;
  difficulty: "starter" | "builder" | "architect";
  estimatedMinutes: number;
  prerequisites: string[];      // slugs of prerequisite crates
  tags: string[];
  sections: Section[];
  thinkAboutIt: string[];       // discussion questions
  tryThis: string[];            // hands-on activities
  funFact: string;
  nextCrate: string | null;     // slug of next lesson
}

export interface Section {
  heading: string;
  body: string;                 // supports simple markdown-like formatting
}

export const miniCrates: MiniCrate[] = [
  // ═══════════════════════════════════════════════
  // CRATE 1: What Even Is AI?
  // ═══════════════════════════════════════════════
  {
    slug: "what-is-ai",
    number: 1,
    title: "What Even Is AI?",
    emoji: "🤖",
    subtitle: "Spoiler: it's not a robot uprising (yet)",
    difficulty: "starter",
    estimatedMinutes: 12,
    prerequisites: [],
    tags: ["introduction", "definitions", "history"],
    sections: [
      {
        heading: "The Big Idea",
        body: `Artificial Intelligence — AI — is when we make computers do things that normally require a human brain. Things like recognizing your face in a photo, translating languages, or beating the world champion at chess.

But here's the thing most people get wrong: AI isn't one single invention. It's more like a toolbox. Inside that toolbox are dozens of different techniques, and each one is good at different things. Some are simple. Some are mind-bendingly complex.

The word "artificial" just means "made by humans" (not fake). And "intelligence" means the ability to learn, reason, and solve problems. Put them together and you get: a human-made system that can learn, reason, and solve problems.`
      },
      {
        heading: "A Brief History (Speed Run)",
        body: `1950 — Alan Turing asks "Can machines think?" and proposes the Turing Test: if a human can't tell whether they're chatting with a machine or a person, the machine passes.

1956 — The term "Artificial Intelligence" is coined at a workshop at Dartmouth College. People are wildly optimistic. They think human-level AI is 20 years away. (It wasn't.)

1966 — ELIZA, one of the first chatbots, tricks people into thinking they're talking to a therapist. It mostly just repeated their words back. Sound familiar?

1997 — IBM's Deep Blue beats world chess champion Garry Kasparov. Kasparov is not happy about it.

2011 — IBM Watson wins Jeopardy! against the best human players.

2016 — Google DeepMind's AlphaGo beats the world champion at Go — a game so complex that there are more possible board positions than atoms in the universe.

2022-now — Large Language Models (LLMs) like ChatGPT change everything. Suddenly AI can write stories, code programs, and explain quantum physics. We're living in this era right now.`
      },
      {
        heading: "What AI Is NOT",
        body: `AI is NOT alive. It doesn't have feelings, dreams, or desires. When an AI says "I'm happy to help!", it doesn't feel happy. It's producing text that matches patterns it learned from millions of examples.

AI is NOT magic. Every AI system follows mathematical rules. It just does the math so fast and on so much data that the results seem magical.

AI is NOT always right. AI can be confidently, spectacularly wrong. This is so common it has a name: "hallucination." Always double-check important stuff.

AI is NOT one thing. There are narrow AIs (good at one specific task, like playing chess) and the dream of general AI (good at everything, like a human). Right now, all AI is narrow — even the impressive chatbots.`
      }
    ],
    thinkAboutIt: [
      "If a calculator can do math faster than any human, is it intelligent? Why or why not?",
      "How would you design a test to figure out if something is truly intelligent?",
      "What's one thing you think AI will be able to do in 10 years that it can't do today?"
    ],
    tryThis: [
      "Talk to an AI chatbot and try to figure out where it makes mistakes. Keep a list.",
      "Write down 5 things you did today. For each one, guess whether AI could do it too.",
      "Ask someone who's been in tech for 10+ years what they thought AI would look like today. How close were they?"
    ],
    funFact: "The term 'bug' in computing comes from 1947 when an actual moth got stuck in a relay of the Harvard Mark II computer. Grace Hopper taped the moth into the logbook and wrote 'First actual case of bug being found.' The moth is still in the Smithsonian.",
    nextCrate: "how-machines-learn"
  },

  // ═══════════════════════════════════════════════
  // CRATE 2: How Machines Learn
  // ═══════════════════════════════════════════════
  {
    slug: "how-machines-learn",
    number: 2,
    title: "How Machines Learn",
    emoji: "🧠",
    subtitle: "Teaching rocks to think, one number at a time",
    difficulty: "starter",
    estimatedMinutes: 15,
    prerequisites: ["what-is-ai"],
    tags: ["machine-learning", "training", "data"],
    sections: [
      {
        heading: "Learning Without Being Programmed",
        body: `Traditional programming works like a recipe: you tell the computer exactly what to do, step by step. "If the email contains 'you won a prize,' move it to spam."

Machine Learning (ML) flips this upside down. Instead of writing rules, you show the computer thousands of examples and let it figure out the rules itself.

Imagine teaching a friend to identify dogs vs. cats. You wouldn't write a 500-page manual of rules ("if it has pointy ears AND whiskers AND..."). You'd just show them pictures: "Dog. Dog. Cat. Dog. Cat. Cat." After enough examples, they get it.

That's exactly how ML works. Show the computer 10,000 pictures of dogs and 10,000 pictures of cats, tell it which is which, and it learns to spot the difference. The "learning" is actually the computer adjusting millions of tiny numbers until it gets good at telling them apart.`
      },
      {
        heading: "The Three Flavors of Learning",
        body: `SUPERVISED LEARNING — The teacher approach
You give the computer both the questions AND the answers. "Here's a photo (question). It's a cat (answer)." The computer learns to match questions to answers. This is the most common type.

Real examples: spam filters, voice assistants understanding speech, medical diagnosis from X-rays.

UNSUPERVISED LEARNING — The explorer approach
You give the computer data but NO answers. "Here are 50,000 shopping receipts. Find interesting patterns." The computer groups similar things together and discovers structure on its own.

Real examples: Netflix suggesting shows you might like, detecting unusual bank transactions.

REINFORCEMENT LEARNING — The gamer approach
The computer learns by trial and error, like playing a video game. It tries something, gets a score (reward or punishment), and adjusts. Over thousands of attempts, it gets really good.

Real examples: AlphaGo learning to play Go, robots learning to walk, self-driving cars.`
      },
      {
        heading: "What Is 'Training' Really?",
        body: `When people say they're "training" an AI, they mean they're feeding it data and letting it adjust its internal numbers (called parameters or weights) until it performs well.

Think of it like tuning a guitar. Each string (parameter) needs to be exactly right. If it's off even a tiny bit, the music sounds wrong. ML is like having a guitar with a million strings, and the computer tunes each one, a tiny bit at a time, until the whole thing sounds right.

The data you train on matters ENORMOUSLY. If you train a facial recognition system only on photos of light-skinned people, it'll be terrible at recognizing dark-skinned people. This isn't the AI being "racist" — it just never learned because no one showed it the right examples. This is why diverse, representative data is critical.

Training big AI models is expensive. Training GPT-4 reportedly cost over $100 million and used more electricity than a small city uses in a year. This is why companies don't retrain from scratch very often.`
      }
    ],
    thinkAboutIt: [
      "Which type of learning (supervised, unsupervised, reinforcement) would work best for teaching AI to play Minecraft? Why?",
      "If you only trained an AI on books from the year 1900, what would it get wrong about the modern world?",
      "Why might it be dangerous to use AI trained on biased data to make decisions about people?"
    ],
    tryThis: [
      "Play 20 Questions with a friend. Notice how each answer narrows down the possibilities — that's similar to how decision trees work in ML!",
      "Collect 20 objects and sort them into groups WITHOUT deciding categories in advance. That's unsupervised learning!",
      "Try Google's Teachable Machine (teachablemachine.withgoogle.com) — train your own image classifier in your browser, no coding needed."
    ],
    funFact: "Google's cat detector (2012) was one of the first big deep learning breakthroughs. Researchers fed a neural network 10 million YouTube thumbnails and it taught itself to recognize cats — without ever being told what a cat looks like. The internet's obsession with cat videos literally advanced AI research.",
    nextCrate: "data-the-fuel"
  },

  // ═══════════════════════════════════════════════
  // CRATE 3: Data — The Fuel
  // ═══════════════════════════════════════════════
  {
    slug: "data-the-fuel",
    number: 3,
    title: "Data — The Fuel of AI",
    emoji: "⛽",
    subtitle: "Garbage in, garbage out (seriously)",
    difficulty: "starter",
    estimatedMinutes: 12,
    prerequisites: ["how-machines-learn"],
    tags: ["data", "datasets", "bias", "privacy"],
    sections: [
      {
        heading: "Why Data Is Everything",
        body: `If AI is a race car, data is the fuel. The best engine in the world is useless without fuel, and the best algorithm is useless without good data.

Here's the uncomfortable truth: most AI breakthroughs in the last decade weren't because someone invented a brilliant new algorithm. They happened because someone got access to MORE DATA and FASTER COMPUTERS. The algorithms we use today are often surprisingly similar to ones invented in the 1980s — they just didn't work back then because we didn't have enough data or computing power.

How much data? The GPT models were trained on hundreds of billions of words — essentially a significant chunk of the internet. Image recognition models train on millions of labeled photos. Self-driving cars use petabytes (millions of gigabytes) of driving footage.`
      },
      {
        heading: "Good Data vs. Bad Data",
        body: `GOOD DATA is:
• Accurate — the labels are correct (that photo really IS a cat)
• Representative — it covers the full range of what you'll encounter
• Clean — no duplicates, no corruption, no irrelevant junk
• Sufficient — enough examples to learn meaningful patterns
• Ethical — collected with consent, respecting privacy

BAD DATA is:
• Biased — only represents some groups or viewpoints
• Noisy — full of errors and mislabeled examples
• Stale — outdated information presented as current
• Sparse — not enough examples for the AI to learn from
• Invasive — scraped without permission, violating privacy

The classic example: an AI system trained to screen job resumes was found to discriminate against women. Why? Because it was trained on 10 years of hiring data from a male-dominated industry. The AI learned that male-sounding resumes were "better" because historically, more men were hired. The data was technically accurate — it just reflected decades of human bias.`
      },
      {
        heading: "Where Does Training Data Come From?",
        body: `SCRAPED FROM THE INTERNET — Common Crawl is a nonprofit that regularly downloads the entire public web. Most large language models train on some version of this. Yes, this includes Reddit posts, Wikipedia articles, blog rants, and probably some truly terrible fan fiction.

CURATED DATASETS — Researchers carefully collect and label data. ImageNet contains 14 million hand-labeled images. MNIST has 70,000 handwritten digits. These are the "benchmarks" that AI researchers use to compare their models.

SYNTHETIC DATA — Sometimes you generate fake data that looks real. Need 100,000 X-ray images but only have 5,000? An AI can generate more. This sounds circular (using AI to train AI), and honestly, it kind of is.

USER-GENERATED — Every time you solve a CAPTCHA ("click all the traffic lights"), you're labeling data for Google. Every time you correct a voice assistant, you're improving its training data. You are an unpaid AI trainer. You're welcome, Silicon Valley.

YOUR OWN DATA — For specific tasks, companies collect their own. A hospital might use its own patient records (anonymized!) to train a diagnostic AI.`
      }
    ],
    thinkAboutIt: [
      "If you were training an AI to recognize different types of pizza, what problems might you run into with your training data?",
      "Should companies be allowed to scrape your social media posts to train AI? Why or why not?",
      "How would you test whether your dataset is biased?"
    ],
    tryThis: [
      "Take 30 photos of things in your room. Try to label them into categories. How hard is it to make consistent labels?",
      "Look at the MNIST dataset online (it's just handwritten numbers). Can YOU tell what some of the messy ones say? That's the labeling problem.",
      "Count how many times in one day you generate data that could theoretically be used to train AI."
    ],
    funFact: "In 2016, Microsoft launched a chatbot called Tay on Twitter. Within 24 hours, internet trolls had taught it to post incredibly offensive things by flooding it with toxic data. Microsoft shut it down in less than a day. The lesson: your AI is only as good (or as terrible) as the data people feed it.",
    nextCrate: "neural-networks"
  },

  // ═══════════════════════════════════════════════
  // CRATE 4: Neural Networks
  // ═══════════════════════════════════════════════
  {
    slug: "neural-networks",
    number: 4,
    title: "Neural Networks — The Brain Factory",
    emoji: "🕸️",
    subtitle: "Inspired by brains, powered by math",
    difficulty: "builder",
    estimatedMinutes: 18,
    prerequisites: ["how-machines-learn"],
    tags: ["neural-networks", "neurons", "layers", "deep-learning"],
    sections: [
      {
        heading: "What's a Neural Network?",
        body: `Your brain has about 86 billion neurons — tiny cells that send electrical signals to each other. Each neuron receives signals, decides whether to "fire," and passes signals to the next neurons. That network of connections is what lets you think, see, remember, and daydream about lunch.

An artificial neural network (ANN) is a loose imitation of this. It's made of simple mathematical "neurons" arranged in layers, where each neuron takes some numbers in, does simple math, and passes a number out.

Here's the key insight: ONE artificial neuron is dumb. It's basically a calculator that can only add and multiply. But MILLIONS of them connected together can recognize faces, translate languages, and generate art.

This is called "emergence" — simple pieces combining to create complex behavior. Ants are dumb individually but build incredible colonies. Neural network neurons are dumb individually but solve incredible problems.`
      },
      {
        heading: "Layers: The Sandwich of Intelligence",
        body: `Neural networks are organized in layers, like a sandwich:

INPUT LAYER — Where the data comes in. For an image, each pixel's color becomes one input. A 100x100 pixel image has 10,000 inputs.

HIDDEN LAYERS — The middle layers where the magic happens. Each layer transforms the data, finding increasingly complex patterns. Early layers might detect edges and colors. Middle layers spot shapes (circles, lines). Later layers recognize objects (eyes, noses, wheels).

OUTPUT LAYER — The answer. For a cat-vs-dog classifier, it might have 2 outputs: the probability it's a cat and the probability it's a dog.

"Deep Learning" just means "neural networks with lots of hidden layers." That's it. The word "deep" refers to the number of layers, not some profound philosophical depth. Modern networks can have hundreds of layers.

Each connection between neurons has a weight — a number that controls how much influence one neuron has on the next. Training is the process of adjusting all these weights until the network gives correct answers. A model like GPT-4 has hundreds of billions of these weights.`
      },
      {
        heading: "How Do They Actually Learn?",
        body: `The learning algorithm is called backpropagation, and it works like this:

1. FORWARD PASS — Feed an input through the network and get an output. "This image is... 80% dog, 20% cat."

2. CALCULATE ERROR — Compare to the real answer. "Actually, it's a cat. You were way off."

3. BACKWARD PASS — Working backwards through the layers, figure out which weights contributed most to the error.

4. ADJUST — Nudge those weights a tiny bit in the direction that would reduce the error.

5. REPEAT — Do this with the next example. And the next. And the next. Millions of times.

Imagine you're throwing darts blindfolded. After each throw, someone tells you "too far left" or "a bit high." You can't see the target, but after thousands of throws and adjustments, you'd start hitting close to the bullseye. That's backpropagation.

The amount you adjust each time is called the learning rate. Too big? You'll overshoot and never settle on a good answer. Too small? It'll take forever to learn. Finding the right learning rate is more art than science.`
      }
    ],
    thinkAboutIt: [
      "Why do you think they call them 'neural' networks even though they're very different from actual brains?",
      "If a neural network has too few layers, it can't learn complex patterns. If it has too many, it memorizes the training data instead of learning general rules. Why might this happen?",
      "A neural network that memorizes training data but fails on new data is called 'overfitting.' Can you think of a human example of this?"
    ],
    tryThis: [
      "Draw a simple neural network on paper: 3 input neurons, 4 hidden neurons, 2 outputs. Draw all the connections. How many weights do you need? (Answer: 3×4 + 4×2 = 20)",
      "Visit playground.tensorflow.org and build neural networks in your browser. Change the layers, neurons, and data to see what happens.",
      "Try to teach yourself a new card game using ONLY trial and error (no reading rules). That's reinforcement learning — similar to how neural networks learn."
    ],
    funFact: "The original idea for artificial neural networks came from a 1943 paper by Warren McCulloch and Walter Pitts. They designed a mathematical model of a neuron using simple logic gates. The catch? Nobody had computers powerful enough to run their ideas for decades. McCulloch never saw his work become the foundation of modern AI.",
    nextCrate: "computer-vision"
  },

  // ═══════════════════════════════════════════════
  // CRATE 5: Computer Vision
  // ═══════════════════════════════════════════════
  {
    slug: "computer-vision",
    number: 5,
    title: "Computer Vision — Teaching Machines to See",
    emoji: "👁️",
    subtitle: "Pixels, patterns, and why Snapchat filters work",
    difficulty: "builder",
    estimatedMinutes: 15,
    prerequisites: ["neural-networks"],
    tags: ["computer-vision", "images", "CNN", "recognition"],
    sections: [
      {
        heading: "How Computers See",
        body: `You see a sunset. A computer sees a grid of numbers.

Every digital image is a grid of pixels. Each pixel has three numbers: how much Red, Green, and Blue light to mix (0-255 each). A 1920x1080 HD image is about 6 million numbers. A computer doesn't "see" the sunset — it processes those 6 million numbers.

The hard part isn't reading pixels. It's understanding what the pixels MEAN. Your brain does this effortlessly — you recognize your friend's face from any angle, in any lighting, even if they got a haircut. This is incredibly hard for computers.

Computer vision is the field of making computers understand images and video. It's everywhere: unlocking your phone with your face, self-driving cars seeing the road, Instagram filters tracking your face, doctors using AI to spot tumors in X-rays.`
      },
      {
        heading: "Convolutional Neural Networks (CNNs)",
        body: `The breakthrough for computer vision was a special type of neural network called a Convolutional Neural Network, or CNN.

Instead of looking at the entire image at once (way too many numbers), CNNs slide a small window across the image, looking at tiny patches. Imagine holding a magnifying glass and scanning it across a photo, inch by inch.

Each filter (window) detects one specific pattern:
• Early filters detect simple things: edges, corners, color gradients
• Middle filters combine those into textures and shapes
• Later filters recognize complex things: eyes, wheels, text

This is almost exactly how your visual cortex works! Your brain processes vision in stages too — from simple shapes to complex objects.

The word "convolution" sounds scary but it just means "sliding a small filter across the image and computing a value at each position." It's like running a stamp across a page.

The breakthrough moment: In 2012, a CNN called AlexNet crushed the competition in the ImageNet challenge (1.2 million images, 1000 categories) by a huge margin. Before AlexNet, computer vision had been improving by tiny increments for years. AlexNet improved accuracy by more than all the previous years combined. This was the moment deep learning went mainstream.`
      },
      {
        heading: "Beyond Just Recognizing: What CV Can Do",
        body: `IMAGE CLASSIFICATION — "This is a photo of a golden retriever." (What is it?)

OBJECT DETECTION — "There are 3 cars, 2 pedestrians, and 1 stop sign in this image, and here's where each one is." (What is it AND where is it?)

SEGMENTATION — Color-coding every single pixel: "These pixels are sky, these are road, these are car." (What is every part of the image?)

FACE RECOGNITION — "This face matches Person #4392 in the database." (Who is it?)

POSE ESTIMATION — "This person's left arm is raised, right knee is bent." (How is the body positioned?) This is how Snapchat knows where to put dog ears on your face.

IMAGE GENERATION — "Here's a new image of a cat wearing a top hat on the moon that never existed before." (Create something new.) This is where AI art tools like DALL-E and Midjourney come in. We'll cover this more later.`
      }
    ],
    thinkAboutIt: [
      "Self-driving cars need to work in rain, snow, night, and fog. Why is this much harder than recognizing objects in clear daylight?",
      "Facial recognition technology can identify people in crowds. What are the benefits AND risks of this technology?",
      "If an AI can generate fake photos of real people that look completely real, what problems could this cause?"
    ],
    tryThis: [
      "Take the same photo of an object in 5 different lighting conditions. See how different the pixels look — this is why computer vision is hard!",
      "Try Google Lens on your phone (or Google Image search on desktop). Upload unusual objects and see if it can identify them.",
      "Draw a simple 5x5 grid on paper. Fill each cell with a number (0 = white, 1 = black). Have a friend try to guess what you drew. This is how low-resolution images work."
    ],
    funFact: "The ImageNet dataset was created by professor Fei-Fei Li and her team, who used Amazon Mechanical Turk to get 49,000 workers from 167 countries to hand-label 14 million images. The project took 2.5 years. When she first proposed the idea, many colleagues said it was pointless. It ended up being one of the most important datasets in AI history.",
    nextCrate: "nlp-language"
  },

  // ═══════════════════════════════════════════════
  // CRATE 6: Natural Language Processing
  // ═══════════════════════════════════════════════
  {
    slug: "nlp-language",
    number: 6,
    title: "Natural Language Processing",
    emoji: "💬",
    subtitle: "How AI learned to read, write, and roast your grammar",
    difficulty: "builder",
    estimatedMinutes: 18,
    prerequisites: ["neural-networks"],
    tags: ["NLP", "language", "text", "transformers", "LLM"],
    sections: [
      {
        heading: "Why Language Is Hard for Computers",
        body: `Language seems easy because humans do it effortlessly. But language is absurdly complex:

"Time flies like an arrow. Fruit flies like a banana."

Same grammar structure. Completely different meanings. "Flies" is a verb in the first sentence and a noun in the second. "Like" means "similar to" in the first and "enjoy" in the second. Humans parse this instantly. Computers struggle.

Sarcasm: "Oh great, another Monday." Happy or sad? Context-dependent.
Ambiguity: "I saw the man with the telescope." Who has the telescope?
Idioms: "It's raining cats and dogs." No animals are involved.
Slang: "That's fire" means good. "That's trash" means bad. Good luck writing rules for this.

Natural Language Processing (NLP) is the field of making computers understand, generate, and work with human language. It's behind search engines, voice assistants, translation tools, email autocomplete, and the AI chatbots taking over the internet.`
      },
      {
        heading: "From Word Counts to Transformers",
        body: `Early NLP was embarrassingly simple. Count how many times each word appears in a document. "Positive" words = positive review. "Negative" words = negative review. This actually worked... sometimes.

Then came WORD EMBEDDINGS (2013) — representing each word as a list of numbers (a vector) where similar words have similar numbers. The famous result: King - Man + Woman = Queen. The math actually worked! Words weren't just text anymore; they had mathematical meaning.

Then came the big one: THE TRANSFORMER (2017). A team at Google published a paper called "Attention Is All You Need" and changed everything. The key idea was "attention" — the model learns to focus on the most relevant parts of the input.

When you read "The cat sat on the mat because IT was tired," you instantly know "it" refers to "the cat." Attention lets the model do the same thing, by learning which words to focus on when processing each word.

Transformers are the foundation of GPT (Generative Pre-trained Transformer), BERT, Claude, and basically every major language AI. The "T" in GPT literally stands for Transformer.`
      },
      {
        heading: "Large Language Models (LLMs)",
        body: `An LLM is basically a giant neural network (transformer architecture) trained on most of the internet's text to do one thing: predict the next word.

That's it. That's the core trick. You give it "The capital of France is" and it predicts "Paris." You give it "Once upon a time" and it predicts "there." It does this one word at a time, using its previous predictions as input for the next prediction.

The wild part is that this simple objective — predicting the next word — when done at massive scale (hundreds of billions of parameters, trained on trillions of words), produces something that can:
• Write essays, code, and poetry
• Solve math problems
• Translate between languages
• Summarize documents
• Answer questions about nearly anything

Nobody explicitly programmed any of these abilities. They EMERGED from next-word prediction at scale. This is one of the most surprising discoveries in AI.

The "Large" in LLM refers to the number of parameters. GPT-3 had 175 billion. Modern models have even more. These parameters are stored as numbers and can take hundreds of gigabytes of storage. Running them requires specialized hardware (GPUs) that costs thousands of dollars.`
      }
    ],
    thinkAboutIt: [
      "When an AI chatbot says 'I think...' or 'I feel...', does it actually think or feel? Why does it use those words?",
      "If an LLM is trained mostly on English text, what might it get wrong about other languages and cultures?",
      "LLMs sometimes 'hallucinate' — they make up facts that sound true but aren't. Why might predicting 'the most likely next word' lead to this?"
    ],
    tryThis: [
      "Try the 'predict the next word' game with a friend. Say a sentence and have them guess the next word. How often are they right? That's what LLMs do billions of times.",
      "Write a paragraph and replace every 5th word with '___'. Can you fill them back in? That's a simplified version of what masked language models (like BERT) do during training.",
      "Ask an AI chatbot the same question 5 times. Do you get exactly the same answer? Why not? (Hint: it has a 'temperature' setting that adds randomness.)"
    ],
    funFact: "The 'Attention Is All You Need' paper that introduced Transformers has been cited over 100,000 times. The title was inspired by a Beatles song. Several of the original eight authors have since left Google to start their own AI companies, collectively worth billions of dollars. One paper, many billionaires.",
    nextCrate: "training-your-own"
  },

  // ═══════════════════════════════════════════════
  // CRATE 7: Training Your Own AI
  // ═══════════════════════════════════════════════
  {
    slug: "training-your-own",
    number: 7,
    title: "Training Your Own AI",
    emoji: "🏋️",
    subtitle: "From zero to model in (many) easy steps",
    difficulty: "builder",
    estimatedMinutes: 20,
    prerequisites: ["data-the-fuel", "neural-networks"],
    tags: ["training", "practical", "python", "coding"],
    sections: [
      {
        heading: "The ML Pipeline",
        body: `Building an AI model follows a standard pipeline. Think of it as a recipe:

1. DEFINE THE PROBLEM — What exactly are you trying to predict or classify? "Is this email spam?" is a clear problem. "Make AI do stuff" is not.

2. COLLECT DATA — Gather examples. The more, the better (usually). If you're building a spam detector, you need thousands of labeled emails: spam and not-spam.

3. PREPARE THE DATA — Clean it up. Remove duplicates, fix errors, handle missing values. This is the boring part. It's also 80% of the work. Seriously. Data scientists spend most of their time cleaning data, not building fancy models.

4. CHOOSE A MODEL — Pick the right architecture. Simple problem? Use a simple model (like logistic regression). Complex images? Use a CNN. Text? Use a transformer. Using a nuclear reactor to toast bread is wasteful. Using a toaster to power a city won't work.

5. TRAIN — Feed the data through the model, adjust weights, repeat. This can take minutes (small model, small data) or months (massive model, massive data).

6. EVALUATE — Test on data the model has NEVER seen before. This is critical. A student who only studies the answers to specific test questions gets 100% on those questions but fails everything else. Same with AI.

7. DEPLOY — Put it in the real world. Monitor it. Things break.`
      },
      {
        heading: "Tools You Can Actually Use",
        body: `You don't need a PhD or a supercomputer to start. Here are tools for beginners:

GOOGLE TEACHABLE MACHINE (teachablemachine.withgoogle.com)
No code required. Train image, sound, or pose classifiers in your browser. You can train a model to tell your cat from your dog in about 5 minutes.

SCRATCH + ML extensions
If you use Scratch (the block-based programming language), there are ML extensions that let you train classifiers and use them in your projects.

PYTHON + scikit-learn
If you're ready for real code, Python is THE language for ML. scikit-learn is a library that makes it easy:

# This trains a spam classifier in 5 lines
from sklearn.naive_bayes import MultinomialNB
model = MultinomialNB()
model.fit(training_emails, training_labels)
predictions = model.predict(new_emails)

GOOGLE COLAB (colab.research.google.com)
Free Jupyter notebooks in the cloud — with free GPU access. You can train neural networks without installing anything.

KAGGLE (kaggle.com)
A platform with thousands of datasets and competitions. Great for practice. Some competitions have cash prizes, and newcomers regularly place well.`
      },
      {
        heading: "Common Mistakes Beginners Make",
        body: `TESTING ON TRAINING DATA — If you train AND test on the same data, your accuracy looks amazing but means nothing. It's like memorizing a test and then taking that exact test. Always keep separate data for testing.

OVERFITTING — Your model learns the training data TOO well. It memorizes noise and quirks instead of learning general patterns. It's like studying only one textbook so hard that you can recite it word-for-word but can't answer questions phrased differently.

UNDERFITTING — Your model is too simple to capture the patterns. Like trying to draw a circle with only straight lines — you'll get a polygon, but it won't be a circle.

IGNORING DATA QUALITY — Throwing more data at a bad model doesn't help. Neither does throwing more computing power at bad data. Fix the data first.

OVER-ENGINEERING — Starting with the most complex model instead of the simplest. Always try a simple model first. Sometimes linear regression (basically drawing a line through points) is all you need. If it works, don't complicate it.

NOT UNDERSTANDING THE PROBLEM — Building a model before clearly defining what "success" looks like. 95% accuracy sounds great until you realize the dataset is 95% one class (like 95% of emails are NOT spam) — a model that always predicts "not spam" gets 95% accuracy while being completely useless.`
      }
    ],
    thinkAboutIt: [
      "Why is it important to test your model on data it has never seen before?",
      "If you were building an AI to grade essays, what would be your training data? What problems might arise?",
      "What's the simplest AI model you could build with items in your room right now?"
    ],
    tryThis: [
      "Go to Google Teachable Machine and train a model to recognize 3 hand gestures (like thumbs up, peace sign, and wave). How many examples do you need before it works well?",
      "If you know any Python, try Google Colab. Load the Iris flower dataset (it's built into scikit-learn) and train a classifier. The whole thing is ~10 lines of code.",
      "Create a paper-based 'decision tree' classifier. Write down yes/no questions that lead to identifying different animals. That's literally a machine learning algorithm!"
    ],
    funFact: "The first time a neural network was used commercially was in 1989, for reading handwritten zip codes on mail envelopes at the US Postal Service. It was designed by Yann LeCun, who later became the chief AI scientist at Meta. Postal workers hated it at first, but it processed mail faster and more accurately than humans.",
    nextCrate: "ai-ethics"
  },

  // ═══════════════════════════════════════════════
  // CRATE 8: AI Ethics — The Hard Questions
  // ═══════════════════════════════════════════════
  {
    slug: "ai-ethics",
    number: 8,
    title: "AI Ethics — The Hard Questions",
    emoji: "⚖️",
    subtitle: "Power, bias, and who gets to decide",
    difficulty: "architect",
    estimatedMinutes: 15,
    prerequisites: ["data-the-fuel"],
    tags: ["ethics", "bias", "fairness", "responsibility", "safety"],
    sections: [
      {
        heading: "Why Ethics in AI Matters NOW",
        body: `AI is no longer just a research topic. It's making real decisions about real people, right now:

• Deciding who gets a loan and who doesn't
• Predicting who might commit a crime
• Screening job applications
• Recommending how long someone should stay in jail
• Choosing what news you see in your feed
• Diagnosing diseases
• Driving cars

When AI makes a mistake on a chess game, nobody gets hurt. When AI makes a mistake deciding whether someone gets parole, a person's life is affected. The stakes are completely different.

The scariest part? Most people affected by AI decisions don't know AI is involved. Insurance rates, hiring decisions, college admissions, loan approvals — AI might already be part of those decisions, and nobody told the people affected.`
      },
      {
        heading: "Bias: The Mirror Problem",
        body: `AI learns from human data. Human data contains human biases. Therefore, AI inherits human biases. It's a mirror, not a crystal ball.

REAL EXAMPLES:
• Amazon's hiring AI learned to downgrade resumes with the word "women's" (like "women's chess club") because historically, Amazon hired mostly men.

• Healthcare AI allocated less care to Black patients because it used health spending (not health needs) as a proxy for health. Because Black patients historically had less access to healthcare (and thus spent less), the AI concluded they were healthier. They weren't.

• Facial recognition systems have error rates 10-100x higher for dark-skinned women compared to light-skinned men, because the training data was predominantly light-skinned faces.

The fix isn't simple. You can't just "remove bias" like removing a bug from code. Bias is baked into the data, the problem definition, the evaluation metrics, and the deployment decisions. Fighting AI bias requires diverse teams, careful data curation, and constant monitoring.

Here's a hard question with no easy answer: Should AI treat everyone identically, even if that leads to unequal outcomes? Or should it account for historical inequalities, which means treating people differently?`
      },
      {
        heading: "Deepfakes, Privacy, and Power",
        body: `DEEPFAKES — AI can now generate fake videos of real people saying things they never said. The technology is getting cheaper and easier every month. How do you trust what you see when seeing is no longer believing?

PRIVACY — AI needs data, and the most useful data is often personal. Your browsing history, messages, photos, location data — all of it is valuable for training AI. Who owns your data? Who profits from it? Did you consent?

SURVEILLANCE — Some countries use AI-powered cameras to track every citizen's movements. Others use it to analyze social media posts and flag "troublemakers." The same face recognition that unlocks your phone can be used to identify protesters in a crowd.

JOB DISPLACEMENT — AI is automating tasks that used to require humans. This creates new jobs AND destroys old ones. The question isn't whether AI will change work — it will. The question is whether the benefits are shared fairly.

POWER CONCENTRATION — Training cutting-edge AI costs hundreds of millions of dollars. Only a handful of companies (Google, Microsoft, Meta, OpenAI, Anthropic) can afford it. This concentrates enormous power in very few hands. Should AI development be more democratized?

ENVIRONMENTAL IMPACT — Training one large AI model can emit as much carbon as five cars over their entire lifetimes. AI data centers use enormous amounts of water for cooling. The environmental cost is real and often ignored.`
      }
    ],
    thinkAboutIt: [
      "If a self-driving car must choose between hitting a pedestrian or swerving into a wall (risking the passenger), who should it protect? Who gets to program that decision?",
      "Should AI-generated art be copyrightable? Who owns it — the person who wrote the prompt, the company that built the AI, or the artists whose work trained it?",
      "If an AI system makes a harmful decision (denying someone a loan unfairly), who is responsible? The programmer? The company? The algorithm itself?"
    ],
    tryThis: [
      "Look up 3 news stories about AI bias. For each one, identify: What data caused the bias? Who was harmed? How could it have been prevented?",
      "Write an 'AI Ethics Constitution' — your 5 rules for how AI should be developed and used. Compare with a friend's rules.",
      "Find a deepfake detection tool online and test it with some images. How accurate is it? What could go wrong if we rely on these tools?"
    ],
    funFact: "In 2018, the European Union passed GDPR, which includes the 'right to explanation' — if an AI makes a decision about you, you have the legal right to know why. This is actually really hard technically because many AI models are 'black boxes' where even the creators can't fully explain individual decisions. Laws and technology don't always move at the same speed.",
    nextCrate: "generative-ai"
  },

  // ═══════════════════════════════════════════════
  // CRATE 9: Generative AI — The Creator
  // ═══════════════════════════════════════════════
  {
    slug: "generative-ai",
    number: 9,
    title: "Generative AI — The Creator",
    emoji: "🎨",
    subtitle: "When AI stops analyzing and starts creating",
    difficulty: "architect",
    estimatedMinutes: 18,
    prerequisites: ["neural-networks", "nlp-language"],
    tags: ["generative", "diffusion", "GANs", "art", "creativity"],
    sections: [
      {
        heading: "From Understanding to Creating",
        body: `For decades, AI was mostly about analysis — classify this image, predict this number, detect this pattern. Generative AI flips the script: instead of understanding existing content, it creates NEW content that never existed before.

Text: ChatGPT, Claude, and others write essays, code, and poetry
Images: DALL-E, Midjourney, and Stable Diffusion create art from text descriptions
Audio: AI generates music, clone voices, and create sound effects
Video: Sora and others generate entire video clips from text
Code: GitHub Copilot writes code alongside you
3D: AI generates 3D models and environments

This is the generative AI revolution, and it's happening right now. The quality has gone from "laughably bad" to "indistinguishable from human work" in about 3 years. That's terrifyingly fast.`
      },
      {
        heading: "How Image Generation Works (Simplified)",
        body: `The most popular approach right now is called DIFFUSION. Here's the intuition:

TRAINING: Take a clear image → gradually add random noise (like TV static) until it's pure chaos → train a neural network to REVERSE this process (remove the noise, step by step).

GENERATION: Start with pure random noise → repeatedly ask the network to remove a little noise → guide it using a text description → eventually you get a clear image.

It's like sculpting from marble. You start with a block (noise) and chip away (denoise) until a statue (image) emerges. The text prompt is like the sculptor's vision — it guides what gets chipped away.

Before diffusion, the main approach was GANs (Generative Adversarial Networks). Two networks compete:
• THE GENERATOR tries to create fake images
• THE DISCRIMINATOR tries to tell real from fake
They train against each other, like an art forger and a detective. Over time, the forger gets so good that the detective can't tell the difference. That's when you have a good generator.

GANs were revolutionary but hard to train (they often "collapse" or produce garbage). Diffusion models are more stable and produce better results, which is why they've largely replaced GANs for image generation.`
      },
      {
        heading: "The Creative Question",
        body: `Is AI-generated art really "art"? This is one of the most debated questions in tech and culture right now.

ARGUMENTS THAT IT IS ART:
• The human writes the prompt and guides the creative vision
• Photography was also called "not real art" when it was invented
• The tool doesn't determine art — the intent does
• Collage, sampling, and remixing are accepted art forms

ARGUMENTS THAT IT ISN'T:
• The AI did the actual creative work, not the human
• It's trained on millions of human artworks without permission or payment
• There's no genuine creative struggle or human expression
• It could devalue human artists' livelihoods

WHAT'S ACTUALLY HAPPENING:
• Artists are using AI as a tool alongside traditional methods
• Companies are replacing human illustrators with AI (saving money, losing jobs)
• New art forms are emerging that couldn't exist without AI
• Courts are slowly deciding copyright questions (still mostly unresolved)
• Many artists are furious about their work being used to train AI without consent

The honest answer is: it's complicated, it's evolving, and we'll probably spend the next decade figuring it out.`
      }
    ],
    thinkAboutIt: [
      "If AI can generate a song that sounds exactly like your favorite artist, should the artist get paid? What if the AI song becomes more popular than the artist's own music?",
      "A student uses AI to write an essay, then edits and improves it. Another student writes from scratch. Who learned more? Should the grades be different?",
      "If AI can generate unlimited content (articles, art, music), what happens to the value of human-created content?"
    ],
    tryThis: [
      "Try an AI image generator (many have free tiers). Generate 10 images and rate them. How many look 'real'? What gives away the fakes?",
      "Write a short story paragraph. Then ask an AI to write one on the same topic. Compare. What's different about the AI's writing?",
      "Try 'prompt engineering' — write different prompts to get the same AI to produce wildly different results. How much does word choice matter?"
    ],
    funFact: "In 2022, an AI-generated image called 'Théâtre D'opéra Spatial' won first prize at the Colorado State Fair's art competition. The artist, Jason Allen, used Midjourney to create it. Real artists were outraged. Allen's response: 'Art is dead, dude. It's over. AI won. Humans lost.' The debate is still raging.",
    nextCrate: "agents-and-the-future"
  },

  // ═══════════════════════════════════════════════
  // CRATE 10: AI Agents & The Future
  // ═══════════════════════════════════════════════
  {
    slug: "agents-and-the-future",
    number: 10,
    title: "AI Agents & The Future",
    emoji: "🚀",
    subtitle: "From chatbots to autonomous agents — and what comes next",
    difficulty: "architect",
    estimatedMinutes: 20,
    prerequisites: ["nlp-language", "generative-ai"],
    tags: ["agents", "AGI", "future", "autonomous", "reasoning"],
    sections: [
      {
        heading: "What Are AI Agents?",
        body: `A chatbot waits for you to type something and responds. An AI agent takes action in the world.

The difference is like ordering food at a restaurant vs. hiring a personal chef. The chatbot (waiter) takes your order and delivers what's available. The agent (chef) goes to the market, picks ingredients, cooks the meal, and adapts if something isn't available.

AI Agents can:
• Browse the web and find information
• Write and run code
• Send emails and messages
• Book appointments
• Manage files on your computer
• Coordinate with other agents
• Plan multi-step tasks and execute them

The key ingredient is AUTONOMY — the agent decides what to do next, not just what to say next. It has tools it can use (like a web browser or code editor) and goals to accomplish.

freshcrate, the site you're reading right now, exists because of this revolution. It tracks the open-source tools that agents use — the packages and frameworks that make autonomous AI possible. You're living in the early days of the agent era.`
      },
      {
        heading: "How Agents Work",
        body: `Modern AI agents follow a loop:

1. OBSERVE — Take in information (user's request, current state, results of past actions)
2. THINK — Use an LLM to reason about what to do next
3. ACT — Use a tool (run code, search the web, call an API)
4. OBSERVE — See the result of the action
5. REPEAT — Keep going until the task is done

This is called the "ReAct" pattern (Reason + Act). The LLM serves as the agent's "brain," and the tools are its "hands."

TOOL USE is what makes agents powerful. An LLM by itself can only generate text. But give it access to tools — a calculator, a web browser, a code interpreter, a database — and suddenly it can do real work.

MEMORY is the next frontier. Current agents forget everything after each conversation. Giving agents long-term memory (remembering your preferences, past projects, ongoing tasks) is an active area of research. Imagine an AI assistant that actually remembers that you hate mushrooms on your pizza, after you told it once, six months ago.

MULTI-AGENT SYSTEMS are when multiple agents collaborate. One agent researches, another writes code, a third reviews for bugs. They argue with each other (yes, really) and produce better results than any single agent alone.`
      },
      {
        heading: "The Big Picture: Where Is All This Going?",
        body: `NARROW AI (where we are now) — AI that's excellent at specific tasks but can't generalize. GPT can write code but can't ride a bike. AlphaGo can play Go but can't play checkers without being retrained.

ARTIFICIAL GENERAL INTELLIGENCE (AGI) — AI that can learn and perform any intellectual task a human can. This doesn't exist yet. Estimates for when it'll arrive range from "5 years" to "never." The honest answer is: nobody knows.

ARTIFICIAL SUPERINTELLIGENCE (ASI) — AI that surpasses human intelligence in every way. This is the sci-fi scenario. Most researchers think this is very far away, if it's even possible.

WHAT TO EXPECT IN THE NEXT 10 YEARS:
• AI agents becoming normal — scheduling, coding, research done by AI
• Personalized education — AI tutors that adapt to how you learn
• Scientific breakthroughs — AI helping discover new drugs and materials
• Creative tools — Everyone becomes a filmmaker, musician, designer
• New jobs we can't imagine — Someone has to manage, audit, and improve AI systems
• Harder questions — Privacy, autonomy, inequality, meaning

THE MOST IMPORTANT THING TO UNDERSTAND:
AI is a tool. The most powerful tool humanity has ever built, but still a tool. Like fire, electricity, and the internet before it, its impact depends on who uses it and how.

You're growing up in the generation that will shape how AI is used. The decisions aren't being made by algorithms — they're being made by people. People like you. Learn how it works. Question what it does. Build things that matter.

The future isn't something that happens to you. It's something you build.`
      }
    ],
    thinkAboutIt: [
      "If AI agents can do most office work, what kinds of skills become MORE valuable for humans? What becomes LESS valuable?",
      "Would you trust an AI agent to manage your calendar, read your emails, and make decisions on your behalf? Where would you draw the line?",
      "If we create AGI (a generally intelligent AI), should it have rights? Why or why not?"
    ],
    tryThis: [
      "Design an AI agent on paper. What's its goal? What tools does it have? What decisions can it make on its own vs. needing human approval? Draw a flowchart of its decision process.",
      "Pick a problem in your workplace or community. How could an AI agent help solve it? What data would it need? What could go wrong?",
      "Write a short essay: 'A Day in 2035.' Describe how AI might be part of everyday life. Be specific — not just 'robots everywhere' but exactly how AI helps with specific tasks."
    ],
    funFact: "The first website ever (info.cern.ch) had no images, no JavaScript, no AI — just hyperlinks. That was 1991. Thirty-five years later, we have AI agents that can build entire websites from a text description. If progress continues at this rate, in another decade today's AI will look as primitive as that first website does to us now.",
    nextCrate: null
  }
];

export function getCrate(slug: string): MiniCrate | undefined {
  return miniCrates.find(c => c.slug === slug);
}

export function getAllCrates(): MiniCrate[] {
  return miniCrates;
}

export function getDifficultyLabel(d: MiniCrate["difficulty"]): string {
  switch (d) {
    case "starter": return "🌱 Starter";
    case "builder": return "🔧 Builder";
    case "architect": return "🏗️ Architect";
  }
}

export function getDifficultyColor(d: MiniCrate["difficulty"]): string {
  switch (d) {
    case "starter": return "bg-green-100 text-green-800 border-green-300";
    case "builder": return "bg-blue-100 text-blue-800 border-blue-300";
    case "architect": return "bg-purple-100 text-purple-800 border-purple-300";
  }
}
