<template>
    <section>
        <h2 class="text-2xl font-bold text-slate-900 mb-6">项目</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
                v-for="project in projects"
                :key="project.name"
                class="p-5 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-all"
            >
                <h3 class="font-semibold text-slate-900">{{ project.name }}</h3>
                <p class="mt-1 text-sm text-slate-600">
                    {{ project.description }}
                </p>
                <a
                    v-if="project.link"
                    :href="project.link"
                    target="_blank"
                    class="mt-3 inline-block text-sm text-purple-600 hover:text-purple-700"
                >
                    {{ project.linkText || "查看 →" }}
                </a>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
const projects = [
    {
        name: "Spring Static Autowire",
        description:
            "Inject Spring beans into static fields of your utility classes in a safe and declarative way.",
        link: "https://github.com/byzdotme/spring-static-autowire",
        linkText: "GitHub →",
    },
];
</script>
