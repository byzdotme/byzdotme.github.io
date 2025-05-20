export interface PersonalInfo {
  name: string;
  birthDate: string;
  location: string;
  hobbies: string[];
}

export interface Education {
  period: string;
  degree: string;
  school: string;
  major: string;
}

export interface WorkExperience {
  period: string;
  company: string;
  position: string;
}

export interface Skill {
  category: string;
  items: string[];
}

export interface ContactInfo {
  email: string;
  github: string;
}

export interface Content {
  personalInfo: PersonalInfo;
  education: Education[];
  workExperience: WorkExperience[];
  skills: Skill[];
  contact: ContactInfo;
}

export const content: Record<string, Content> = {
  en: {
    personalInfo: {
      name: "Tony Zhu",
      birthDate: "1989.06",
      location: "Beijing",
      hobbies: ["Badminton"]
    },
    education: [
      {
        period: "2007-2011",
        degree: "Bachelor",
        school: "World-Class University",
        major: "Software Engineering"
      }
    ],
    workExperience: [
      {
        period: "2018-Present",
        company: "Food Delivery Company",
        position: "Java Backend Engineer"
      },
      {
        period: "2017-2018",
        company: "Mobile Phone Company",
        position: "Java Backend Engineer"
      },
      {
        period: "2015-2017",
        company: "Real Estate Agency",
        position: "Java Backend Engineer"
      }
    ],
    skills: [
      {
        category: "Backend Development",
        items: [
          "Proficient in Java technology stack",
          "MySQL, PostgreSQL and other relational databases",
          "NoSQL databases",
          "Big Data ecosystem"
        ]
      },
      {
        category: "Frontend Development",
        items: [
          "Familiar with web frontend technologies",
          "Proficient in Vue.js ecosystem"
        ]
      },
      {
        category: "Other Skills",
        items: [
          "Mobile development",
          "Large Language Model applications"
        ]
      }
    ],
    contact: {
      email: "your.email@example.com",
      github: "https://github.com/byzdotme"
    }
  },
  zh: {
    personalInfo: {
      name: "小朱",
      birthDate: "1989.06",
      location: "北京",
      hobbies: ["羽毛球"]
    },
    education: [
      {
        period: "2007-2011",
        degree: "本科",
        school: "某世界一流大学",
        major: "软件工程"
      }
    ],
    workExperience: [
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
    ],
    skills: [
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
    ],
    contact: {
      email: "your.email@example.com",
      github: "https://github.com/byzdotme"
    }
  }
}; 