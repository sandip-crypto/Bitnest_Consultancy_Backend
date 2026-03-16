require("dotenv").config();
const mongoose = require("mongoose");
const FAQ = require("../src/models/faq.model");

const MONGO_URI = process.env.MONGO_URI;

function slugify(text = "") {
    return text
        .toString()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const sampleFaqs = [
    {
        question: "What services does your consultancy provide?",
        answer:
            "We assist students with university selection, application processing, documentation guidance, SOP and CV review, visa preparation, interview support, and pre-departure counseling.",
        category: "General",
        order: 0,
        isActive: true,
        featured: true,
    },
    {
        question: "How do I start my study abroad application?",
        answer:
            "Start by scheduling an initial counseling session. We evaluate your academic profile, budget, preferred destination, and long-term goals before recommending suitable universities.",
        category: "Applications",
        order: 1,
        isActive: true,
        featured: true,
    },
    {
        question: "Do I need IELTS, PTE, or TOEFL for admission?",
        answer:
            "Most universities require an English proficiency test such as IELTS, PTE, or TOEFL. Some institutions may waive this requirement if your previous education was conducted in English.",
        category: "English Tests",
        order: 2,
        isActive: true,
        featured: false,
    },
    {
        question: "What documents are required for admission?",
        answer:
            "Typical documents include academic transcripts, certificates, passport copy, English test score, statement of purpose, recommendation letters, and sometimes a CV or portfolio.",
        category: "Documentation",
        order: 3,
        isActive: true,
        featured: true,
    },
    {
        question: "Can you help me choose the right country and university?",
        answer:
            "Yes. Our counselors analyze your academic background, career goals, and financial situation to recommend the most suitable countries, universities, and programs.",
        category: "Counseling",
        order: 4,
        isActive: true,
        featured: false,
    },
    {
        question: "How long does the admission process take?",
        answer:
            "Depending on the country and university, the admission process may take anywhere from a few days to several weeks after submitting a complete application.",
        category: "Applications",
        order: 5,
        isActive: true,
        featured: false,
    },
    {
        question: "Do universities abroad offer scholarships?",
        answer:
            "Yes. Many universities offer scholarships based on academic merit, financial need, or special achievements. Availability varies by institution and program.",
        category: "Scholarships",
        order: 6,
        isActive: true,
        featured: true,
    },
    {
        question: "Can you review my SOP and CV?",
        answer:
            "Absolutely. We review and improve your Statement of Purpose, motivation letter, and CV to ensure they align with university expectations and increase admission chances.",
        category: "Documentation",
        order: 7,
        isActive: true,
        featured: false,
    },
    {
        question: "What happens after I receive my offer letter?",
        answer:
            "Once you receive your offer letter, we guide you through acceptance procedures, tuition deposit if required, visa documentation preparation, and next steps.",
        category: "Offers",
        order: 8,
        isActive: true,
        featured: false,
    },
    {
        question: "Do you provide visa interview preparation?",
        answer:
            "Yes. We conduct visa preparation sessions including mock interviews, document review, and tips to confidently answer common visa questions.",
        category: "Visa",
        order: 9,
        isActive: true,
        featured: true,
    },
];

function attachUniqueSlugs(items) {
    const used = new Set();

    return items.map((item) => {
        const baseSlug = slugify(item.question) || `faq-${Date.now()}`;
        let slug = baseSlug;
        let counter = 1;

        while (used.has(slug)) {
            slug = `${baseSlug}-${counter++}`;
        }

        used.add(slug);

        return {
            ...item,
            slug,
        };
    });
}

async function seedFaqs() {
    try {
        if (!MONGO_URI) {
            throw new Error("MONGO_URI is missing in environment variables");
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected to database");

        const existingCount = await FAQ.countDocuments();

        if (existingCount > 0) {
            console.log(
                `Database already has ${existingCount} FAQs. Skipping seed to prevent duplicates.`
            );
            process.exit(0);
        }

        const faqsWithSlugs = attachUniqueSlugs(sampleFaqs);

        await FAQ.insertMany(faqsWithSlugs);

        console.log(`Successfully seeded ${faqsWithSlugs.length} FAQs`);
        process.exit(0);
    } catch (error) {
        console.error("FAQ seed failed:", error);
        process.exit(1);
    }
}

seedFaqs();