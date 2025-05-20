import { Locale } from './config'

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

export interface ProjectType {
  title: Record<Locale, string>
  description: Record<Locale, string>
  tech: string[]
  getLink: (content: Content) => string
}

export interface Content {
  personalInfo: PersonalInfo;
  education: Education[];
  workExperience: WorkExperience[];
  skills: Skill[];
  contact: ContactInfo;
}

export interface PageElement {
  home: {
    hero: {
      text: string
      tagline: string
      actions: {
        about: {
          text: string
          link: string
        }
        projects: {
          text: string
          link: string
        }
      }
    }
    features: {
      backend: {
        title: string
      }
      frontend: {
        title: string
      }
      fullstack: {
        title: string
        details: string
      }
    }
  }
  about: {
    title: string
  }
  projects: {
    title: string
    subtitle: string
    viewProject: string
    comingSoon: {
      title: string
      description: string
    }
  }
  contact: {
    title: string
    subtitle: string
    messageBoard: {
      title: string
      subtitle: string
      placeholder: string
    }
  }
  profile: {
    personalInfo: {
      title: string
      name: string
      birthDate: string
      location: string
      hobbies: string
    }
    education: {
      title: string
    }
    workExperience: {
      title: string
    }
    skills: {
      title: string
    }
    contact: {
      title: string
    }
  }
}

export const projectTypes: Record<string, ProjectType> = {
  personalWebsite: {
    title: {
      en: 'Personal Website',
      zh: '个人网站'
    },
    description: {
      en: 'A personal website built with VitePress, supporting both English and Chinese, showcasing resume and portfolio.',
      zh: '使用 VitePress 构建的个人网站，支持中英文双语，展示个人简历和作品集。'
    },
    tech: ['VitePress', 'Vue 3', 'TypeScript', 'Markdown'],
    getLink: (content) => content?.contact?.github?.replace('github.com', 'github.com/byzdotme/byzdotme.github.io') || '#'
  }
}

export const content: Record<Locale, Content> = {
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

export const pageElement: Record<Locale, PageElement> = {
  en: {
    home: {
      hero: {
        text: 'Java Backend Engineer',
        tagline: 'Passionate about software development and technology innovation',
        actions: {
          about: {
            text: 'About Me',
            link: '/about'
          },
          projects: {
            text: 'View Projects',
            link: '/projects'
          }
        }
      },
      features: {
        backend: {
          title: 'Backend Development'
        },
        frontend: {
          title: 'Frontend Development'
        },
        fullstack: {
          title: 'Full Stack Experience',
          details: 'Experience in building and maintaining full-stack applications with a focus on scalability and performance.'
        }
      }
    },
    about: {
      title: 'About Me'
    },
    projects: {
      title: 'Projects',
      subtitle: 'Here are some of my personal projects and work achievements',
      viewProject: 'View Project',
      comingSoon: {
        title: 'More Projects Coming Soon',
        description: 'More projects are under development...'
      }
    },
    contact: {
      title: 'Contact',
      subtitle: 'Feel free to reach out to me through the following channels',
      messageBoard: {
        title: 'Message Board',
        subtitle: 'You can also leave a message here, and I will reply as soon as possible',
        placeholder: 'Message board feature is under development...'
      }
    },
    profile: {
      personalInfo: {
        title: 'Personal Information',
        name: 'Name',
        birthDate: 'Birth Date',
        location: 'Location',
        hobbies: 'Hobbies'
      },
      education: {
        title: 'Education'
      },
      workExperience: {
        title: 'Work Experience'
      },
      skills: {
        title: 'Skills'
      },
      contact: {
        title: 'Contact'
      }
    }
  },
  zh: {
    home: {
      hero: {
        text: 'Java后端工程师',
        tagline: '热爱软件开发与技术创新的全栈工程师',
        actions: {
          about: {
            text: '关于我',
            link: '/zh/about'
          },
          projects: {
            text: '查看作品',
            link: '/zh/projects'
          }
        }
      },
      features: {
        backend: {
          title: '后端开发'
        },
        frontend: {
          title: '前端开发'
        },
        fullstack: {
          title: '全栈经验',
          details: '具有构建和维护全栈应用的经验，注重可扩展性和性能优化。'
        }
      }
    },
    about: {
      title: '关于我'
    },
    projects: {
      title: '作品集',
      subtitle: '这里展示了我的一些个人项目和工作成果',
      viewProject: '查看项目',
      comingSoon: {
        title: '待添加项目',
        description: '更多项目正在开发中...'
      }
    },
    contact: {
      title: '联系方式',
      subtitle: '如果您有任何问题或合作意向，欢迎通过以下方式联系我',
      messageBoard: {
        title: '留言板',
        subtitle: '您也可以在这里留下您的留言，我会尽快回复',
        placeholder: '留言板功能正在开发中...'
      }
    },
    profile: {
      personalInfo: {
        title: '个人信息',
        name: '姓名',
        birthDate: '出生日期',
        location: '所在地',
        hobbies: '兴趣爱好'
      },
      education: {
        title: '教育经历'
      },
      workExperience: {
        title: '工作经历'
      },
      skills: {
        title: '技能'
      },
      contact: {
        title: '联系方式'
      }
    }
  }
}; 