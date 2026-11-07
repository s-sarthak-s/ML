// Course manifest: single source of truth for navigation, index cards and progress.
window.COURSE = {
  title: "Inside the Machine",
  subtitle: "A hands-on course on how LLM systems actually work",
  parts: [
    { id: "I",   name: "Foundations",          blurb: "Just enough math, explained one symbol at a time." },
    { id: "II",  name: "How models work",      blurb: "From a single neuron to a full transformer." },
    { id: "III", name: "Running models",       blurb: "Training cost, inference speed, memory, and precision." },
    { id: "IV",  name: "Adapting models",      blurb: "Fine-tuning, preference tuning, retrieval, and agents." },
    { id: "V",   name: "Shipping it",          blurb: "Measuring quality and running models in production." },
    { id: "VI",  name: "Beyond text",          blurb: "Images, audio, video, and why models keep improving." },
    { id: "VII", name: "Inference eng. I",     blurb: "The machine: GPUs, memory hierarchies, kernels, compilers, profiling." },
    { id: "VIII",name: "Inference eng. II",    blurb: "Serving at scale: engines, distributed inference, the platform and its operations." },
    { id: "IX",  name: "Practice",             blurb: "Labs with measurable exit criteria and a study plan." }
  ],
  modules: [
    { n: "00", part: "I",   file: "00-start.html",          title: "Start here",                    short: "How to use this course and the one mental model behind everything.", topics: ["roadmap", "bytes per token", "how to study"] },
    { n: "01", part: "I",   file: "01-linear-algebra.html", title: "Vectors & matrices",            short: "Dot products, matrix multiplication, shapes, and why everything is a matmul.", topics: ["vectors", "dot product", "cosine", "matmul", "shapes"] },
    { n: "02", part: "I",   file: "02-calculus.html",       title: "Gradients & optimization",      short: "Derivatives, the chain rule, gradient descent, momentum, and Adam.", topics: ["derivative", "gradient", "chain rule", "SGD", "Adam"] },
    { n: "03", part: "I",   file: "03-probability.html",    title: "Probability & information",     short: "Softmax, log-probs, cross-entropy, KL divergence, entropy, perplexity.", topics: ["softmax", "cross-entropy", "KL", "entropy", "perplexity"] },
    { n: "04", part: "II",  file: "04-neural-nets.html",    title: "Neural networks & backprop",    short: "Neurons, activations, MLPs, and how backpropagation computes gradients.", topics: ["neuron", "activations", "MLP", "backprop", "init"] },
    { n: "05", part: "II",  file: "05-tokens.html",         title: "Tokens & embeddings",           short: "Byte-pair encoding, vocabularies, embedding spaces, and tokenizer pitfalls.", topics: ["BPE", "vocab", "embeddings", "unembedding"] },
    { n: "06", part: "II",  file: "06-transformer.html",    title: "The transformer",               short: "Attention, multi-head, the residual stream, norms, MLPs, RoPE, parameter counts.", topics: ["attention", "multi-head", "RoPE", "RMSNorm", "SwiGLU"] },
    { n: "07", part: "III", file: "07-training.html",       title: "Training LLMs",                 short: "Pretraining, FLOPs, scaling laws, training memory, mixed precision, parallelism.", topics: ["6ND", "Chinchilla", "ZeRO/FSDP", "bf16", "LR schedules"] },
    { n: "08", part: "III", file: "08-inference.html",      title: "Inference & context",           short: "Prefill vs decode, KV cache, sampling, rooflines, batching, long context.", topics: ["KV cache", "GQA", "roofline", "sampling", "spec decoding"] },
    { n: "09", part: "III", file: "09-quantization.html",   title: "Quantization",                  short: "Number formats, scales and zero points, outliers, GPTQ/AWQ, GGUF, picking a quant.", topics: ["int8/int4", "absmax", "group-wise", "GPTQ", "AWQ", "GGUF"] },
    { n: "10", part: "IV",  file: "10-finetuning.html",     title: "Fine-tuning",                   short: "SFT, LoRA, QLoRA, data, hyperparameters, and preference tuning with RLHF/DPO/GRPO.", topics: ["SFT", "LoRA", "QLoRA", "DPO", "GRPO", "distillation"] },
    { n: "11", part: "IV",  file: "11-rag.html",            title: "Retrieval-augmented generation", short: "Chunking, embeddings, vector indexes, BM25, hybrid search, reranking, RAG evals.", topics: ["chunking", "HNSW", "BM25", "RRF", "rerankers", "nDCG"] },
    { n: "12", part: "IV",  file: "12-agents.html",         title: "Agents & context engineering",  short: "Tool calling, the agent loop, memory, context budgets, MCP, and agent evals.", topics: ["tool calling", "ReAct", "context budget", "MCP", "memory"] },
    { n: "13", part: "V",   file: "13-eval-production.html",title: "Evaluation & production",       short: "Benchmarks, LLM judges, statistics, serving metrics, cost, and observability.", topics: ["pass@k", "LLM-as-judge", "bootstrap", "TTFT/TPOT", "cost"] },
    { n: "14", part: "VI",  file: "14-multimodal.html",     title: "Seeing & hearing",              short: "How models read images and audio: patches, ViTs, CLIP, spectrograms, Whisper, VLMs.", topics: ["ViT", "CLIP", "VLMs", "spectrograms", "Whisper", "audio tokens"] },
    { n: "15", part: "VI",  file: "15-generative-media.html", title: "Generating images, audio & video", short: "Diffusion, flow matching, latent space, DiTs, video models, and audio generation.", topics: ["diffusion", "flow matching", "VAE", "DiT", "CFG", "video"] },
    { n: "16", part: "VI",  file: "16-progress.html",       title: "Why models keep getting better", short: "Scaling, data curation, synthetic data, RL, test-time compute, and algorithmic efficiency.", topics: ["scaling", "data quality", "synthetic data", "RLVR", "test-time compute"] },
    { n: "17", part: "VII", file: "17-gpus.html",           title: "GPUs & accelerators",           short: "SMs, tensor cores, HBM vs SRAM, the CUDA model, rooflines, interconnects, and picking hardware.", topics: ["SMs", "tensor cores", "HBM", "CUDA model", "NVLink", "roofline"] },
    { n: "18", part: "VII", file: "18-kernels.html",        title: "Kernels, compilers & profiling", short: "Fusion, tiling, Triton, FlashAttention internals, quantized GEMMs, torch.compile, CUDA graphs, Nsight.", topics: ["fusion", "Triton", "tiling", "CUDA graphs", "torch.compile", "MBU"] },
    { n: "19", part: "VIII",file: "19-engines.html",        title: "Inside an inference engine",     short: "Schedulers, continuous batching, chunked prefill, paged KV, prefix caching, engine tuning.", topics: ["scheduler", "chunked prefill", "paged KV", "RadixAttention", "vLLM/SGLang"] },
    { n: "20", part: "VIII",file: "20-distributed-inference.html", title: "Distributed inference",  short: "Tensor/pipeline/expert parallelism, all-reduce costs, disaggregated prefill/decode, KV offloading.", topics: ["TP/PP/EP", "NCCL", "all-to-all", "disaggregation", "KV transfer"] },
    { n: "21", part: "VIII",file: "21-serving-platform.html", title: "The serving platform",         short: "Gateways, KV-aware routing, autoscaling, cold starts, Kubernetes, SLOs, cost, reliability, load testing.", topics: ["routing", "autoscaling", "cold start", "k8s", "SLOs", "load testing"] },
    { n: "22", part: "IX",  file: "22-labs.html",           title: "Labs & study plan",              short: "Hands-on labs with measurable exit criteria, a capstone, and a reading list.", topics: ["labs", "capstone", "reading list"] }
  ]
};
