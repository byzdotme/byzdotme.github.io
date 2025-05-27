<script setup lang="ts">
interface PersonalInfo {
  name: string;
  birthDate: string;
  location: string;
  hobbies: string[];
}

interface Education {
  period: string;
  degree: string;
  school: string;
  major: string;
}

interface WorkExperience {
  period: string;
  company: string;
  position: string;
}

interface Skill {
  category: string;
  items: string[];
}

interface ContactInfo {
  email: string;
  github: string;
}

const personalInfo: PersonalInfo = {
  name: "小朱",
  birthDate: "1989.06",
  location: "北京",
  hobbies: ["羽毛球"]
};

const education: Education[] = [
  {
    period: "2007-2011",
    degree: "本科",
    school: "某世界一流大学",
    major: "软件工程"
  }
];

const workExperience: WorkExperience[] = [
  {
    period: "2018至今",
    company: "某外卖公司",
    position: "Java后端工程师"
  },
  {
    period: "2017-2018",
    company: "某手机公司",
    position: "Java后端工程师"
  },
  {
    period: "2015-2017",
    company: "某房产中介公司",
    position: "Java后端工程师"
  }
];

const skills: Skill[] = [
  {
    category: "后端开发",
    items: [
      "精通Java技术栈",
      "MySQL、PostgreSQL等关系型数据库",
      "NoSQL数据库",
      "大数据体系"
    ]
  },
  {
    category: "前端开发",
    items: [
      "熟悉web前端技术",
      "尤其熟悉Vue技术栈"
    ]
  },
  {
    category: "其他技能",
    items: [
      "了解移动端开发领域",
      "了解大模型应用"
    ]
  }
];

const contact: ContactInfo = {
  email: "your.email@example.com",
  github: "https://github.com/byzdotme"
};
</script>

<template>
  <div class="profile-container">
    <!-- 个人信息 -->
    <section class="profile-section">
      <h2>个人信息</h2>
      <div class="info-grid">
        <div class="info-item">
          <strong>姓名:</strong>
          <span>{{ personalInfo.name }}</span>
        </div>
        <div class="info-item">
          <strong>出生日期:</strong>
          <span>{{ personalInfo.birthDate }}</span>
        </div>
        <div class="info-item">
          <strong>所在地:</strong>
          <span>{{ personalInfo.location }}</span>
        </div>
        <div class="info-item">
          <strong>兴趣爱好:</strong>
          <span>{{ personalInfo.hobbies.join(', ') }}</span>
        </div>
      </div>
    </section>

    <!-- 教育经历 -->
    <section class="profile-section">
      <h2>教育经历</h2>
      <div class="timeline">
        <div v-for="edu in education" :key="edu.period" class="timeline-item">
          <div class="timeline-period">{{ edu.period }}</div>
          <div class="timeline-content">
            <h3>{{ edu.degree }} - {{ edu.major }}</h3>
            <p>{{ edu.school }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 工作经历 -->
    <section class="profile-section">
      <h2>工作经历</h2>
      <div class="timeline">
        <div v-for="work in workExperience" :key="work.period" class="timeline-item">
          <div class="timeline-period">{{ work.period }}</div>
          <div class="timeline-content">
            <h3>{{ work.position }}</h3>
            <p>{{ work.company }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 技能 -->
    <section class="profile-section">
      <h2>技能</h2>
      <div class="skills-grid">
        <div v-for="skill in skills" :key="skill.category" class="skill-category">
          <h3>{{ skill.category }}</h3>
          <ul>
            <li v-for="item in skill.items" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 联系方式 -->
    <section class="profile-section">
      <h2>联系方式</h2>
      <div class="contact-grid">
        <div class="contact-item">
          <strong>Email:</strong>
          <a :href="'mailto:' + contact.email">{{ contact.email }}</a>
        </div>
        <div class="contact-item">
          <strong>GitHub:</strong>
          <a :href="contact.github" target="_blank" rel="noopener noreferrer">
            {{ contact.github.replace('https://github.com/', '') }}
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-section {
  margin-bottom: 3rem;
}

.profile-section h2 {
  font-size: 1.8rem;
  color: var(--vp-c-text-1);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--vp-c-brand);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item strong {
  color: var(--vp-c-text-2);
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.timeline-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
}

.timeline-period {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.timeline-content h3 {
  font-size: 1.2rem;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
}

.timeline-content p {
  color: var(--vp-c-text-2);
  margin: 0;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.skill-category h3 {
  font-size: 1.2rem;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
}

.skill-category ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.skill-category li {
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
  padding-left: 1.5rem;
  position: relative;
}

.skill-category li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--vp-c-brand);
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.contact-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.contact-item strong {
  color: var(--vp-c-text-2);
}

.contact-item a {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.contact-item a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .profile-container {
    padding: 1rem;
  }

  .timeline-item {
    grid-template-columns: 1fr;
  }

  .timeline-period {
    margin-bottom: 0.5rem;
  }
}
</style> 