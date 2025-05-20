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

export const pageElement: Record<string, PageElement> = {
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
} 