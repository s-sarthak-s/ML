# Inside the Machine

A self-study course on how LLM systems work, built as a set of interactive web pages. It starts with the math, explained one symbol at a time, and works up through transformers, training, inference, quantization, fine-tuning, retrieval, agents, evaluation, multimodal and generative models, and the inference-engineering stack.

Everything runs offline. Open `site/index.html` in a browser; there's no server, build step or network access involved. KaTeX and the fonts are bundled in `site/assets/`.

## What's on each page

- **Formula cards.** Every important equation has colour-coded symbols. Hover a symbol to see what it means, and read the plain-English version underneath.
- **Widgets.** Sliders, live plots and small simulations: a KV-cache calculator, a float bit explorer, a 2D diffusion sampler, a BM25 playground, an in-browser MLP trainer, and more.
- **Quizzes.** Each module ends with short questions, mostly calculations or predictions. Answers and progress are saved in your browser's localStorage.
- **Code.** Snippets for PyTorch, transformers, TRL/PEFT, vLLM, llama.cpp and MLX, plus a lab with measurable exit criteria.

## Modules

| Part | Modules |
|---|---|
| I · Foundations | 00 Start here · 01 Vectors & matrices · 02 Gradients & optimization · 03 Probability & information |
| II · How models work | 04 Neural networks & backprop · 05 Tokens & embeddings · 06 The transformer |
| III · Running models | 07 Training LLMs · 08 Inference & context · 09 Quantization |
| IV · Adapting models | 10 Fine-tuning · 11 Retrieval-augmented generation · 12 Agents & context engineering |
| V · Shipping it | 13 Evaluation & production |
| VI · Beyond text | 14 Seeing & hearing · 15 Generating images, audio & video · 16 Why models keep getting better |
| VII · Inference engineering I | 17 GPUs & accelerators · 18 Kernels, compilers & profiling |
| VIII · Inference engineering II | 19 Inside an inference engine · 20 Distributed inference · 21 The serving platform |
| IX · Practice | 22 Labs & study plan |

The inference-engineering track (17–21) goes from GPU architecture and kernels through engine internals, distributed inference and the serving platform around it.

## Layout

```
site/
  index.html              course map
  modules/NN-*.html       one self-contained page per module
  assets/
    course.js             sidebar, KaTeX, formula cards, quizzes, progress, widget helpers (window.C)
    manifest.js           module list (drives navigation and the map)
    style.css             design system
    vendor/katex/         KaTeX 0.16.22 (MIT)
    fonts/                Newsreader, Inter, JetBrains Mono (SIL OFL 1.1, licences in fonts/licenses/)
AUTHORING.md              rules and helper API for writing a module
scripts/check-module.mjs  structure lint: counts, local-only assets, KaTeX validity, quiz shape, script syntax
scripts/check-links.mjs   every relative href and #fragment resolves
```

To check modules and links after editing:

```
node scripts/check-module.mjs site/modules/*.html
node scripts/check-links.mjs
```

## Accuracy

The pages cite the papers they draw on, and they mark estimates and rules of thumb as such. Some numbers are approximate, and some library flags will drift as tools change. If something looks wrong, check the cited source.
