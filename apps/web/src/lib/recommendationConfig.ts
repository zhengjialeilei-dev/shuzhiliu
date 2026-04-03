import {
  Compass,
  GraduationCap,
  Lightbulb,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ResourceReference {
  routePath?: string;
  filePath?: string;
  title?: string;
}

interface RecommendationBase {
  key: string;
  title: string;
  summary: string;
  badges: string[];
}

export interface InternalResourceRecommendation extends RecommendationBase {
  kind: 'internal_resource';
  resourceRef: ResourceReference;
  fallbackRefs?: ResourceReference[];
  titleOverride?: string;
  reason: string;
  audience: string;
}

export interface PromptTemplateRecommendation extends RecommendationBase {
  kind: 'prompt_template';
  useCase: string;
  prompt: string;
  recommendedTools: string[];
  expectedOutput: string;
}

export interface ExternalRecommendation extends RecommendationBase {
  kind: 'external_tool' | 'teacher_website';
  url: string;
  bestFor: string;
  cautions: string;
  access: string;
  pairedPromptTitle?: string;
}

export type RecommendationContent =
  | InternalResourceRecommendation
  | PromptTemplateRecommendation
  | ExternalRecommendation;

export interface FeaturedThemeConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  focusLabel: string;
  resource: InternalResourceRecommendation;
  prompt: PromptTemplateRecommendation;
  extension: ExternalRecommendation;
}

export interface TeachingActionSectionConfig {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  items: RecommendationContent[];
}

export interface RecommendationCollectionConfig {
  sectionId: string;
  title: string;
  subtitle: string;
  description: string;
  items: RecommendationContent[];
}

export interface TeachingTipConfig {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface RecommendationPageConfig {
  hero: FeaturedThemeConfig;
  teachingActions: TeachingActionSectionConfig[];
  promptTemplates: PromptTemplateRecommendation[];
  aiTools: ExternalRecommendation[];
  teacherWebsites: ExternalRecommendation[];
  collections: RecommendationCollectionConfig[];
  teachingTips: TeachingTipConfig[];
}

const promptLessonPlan: PromptTemplateRecommendation = {
  key: 'prompt-lesson-plan',
  kind: 'prompt_template',
  title: '40 分钟数学教案生成器',
  summary: '把课题、年级和目标喂进去，快速拿到一份结构完整的课堂流程。',
  useCase: '备课起步，先把整节课的骨架搭出来。',
  prompt:
    '你是一名熟悉小学数学课堂的一线教研员。请围绕【课题】为【年级】设计一节 40 分钟课堂教案。输出结构必须包含：1. 学情分析 2. 教学目标（知识技能、过程方法、情感态度）3. 教学重难点 4. 教学准备 5. 教学流程（导入、新授、互动练习、总结、作业）6. 教师提问语句示例 7. 板书设计建议。要求语言简洁，活动可执行，适合投屏课堂使用。',
  recommendedTools: ['豆包', 'Kimi', '通义千问'],
  expectedOutput: '一份可继续精修的完整教案初稿',
  badges: ['备课提效', '整课骨架'],
};

const promptObjectives: PromptTemplateRecommendation = {
  key: 'prompt-objectives',
  kind: 'prompt_template',
  title: '按课标改写教学目标',
  summary: '把教材语言改成更像课堂行动目标的表达，减少目标写作时间。',
  useCase: '备课中段，用来快速收敛目标表述。',
  prompt:
    '请根据【课题】【年级】【教材内容摘要】和【课程标准要求】, 为小学数学课改写 3-4 条教学目标。目标需要区分知识与技能、过程与方法、情感与价值，使用可观察、可评价的课堂行为动词，不要空泛表述。最后再补一行“本节课评价重点”。',
  recommendedTools: ['豆包', '通义千问'],
  expectedOutput: '更贴近课堂执行的教学目标与评价重点',
  badges: ['课标对齐', '目标重写'],
};

const promptQuestions: PromptTemplateRecommendation = {
  key: 'prompt-questions',
  kind: 'prompt_template',
  title: '课堂提问链生成器',
  summary: '围绕一个知识点输出导入问、追问、纠错问和总结问。',
  useCase: '公开课、磨课或想提升课堂追问质量时最有用。',
  prompt:
    '请围绕【课题】为【年级】设计一条课堂提问链，至少包含 8 个问题，按“导入问题 - 观察问题 - 推理问题 - 纠错问题 - 总结问题”的顺序展开。每个问题后补一句“教师期待学生说出的关键点”，语言适合小学课堂口语表达。',
  recommendedTools: ['Kimi', '豆包'],
  expectedOutput: '一组可直接带进课堂的提问与追问清单',
  badges: ['追问设计', '课堂对话'],
};

const promptHomework: PromptTemplateRecommendation = {
  key: 'prompt-homework',
  kind: 'prompt_template',
  title: '分层作业设计助手',
  summary: '同一课题一次生成基础、提升、挑战三层任务，方便课后巩固。',
  useCase: '新授课结束后快速补齐作业设计。',
  prompt:
    '请根据【课题】【年级】和【本节课学生易错点】设计一份分层作业。分为基础层、提升层、挑战层，每层 3 题；每题需标注考查点，并在最后附上教师使用建议，说明哪类学生适合哪一层。',
  recommendedTools: ['通义千问', '豆包'],
  expectedOutput: '结构清楚的分层练习单草稿',
  badges: ['分层练习', '课后巩固'],
};

const promptParents: PromptTemplateRecommendation = {
  key: 'prompt-parents',
  kind: 'prompt_template',
  title: '家校沟通话术生成',
  summary: '把课后提醒写得更温和、更清晰，省去重复组织语言的时间。',
  useCase: '布置作业、说明课堂重点、同步复习建议时使用。',
  prompt:
    '请围绕【课题】为小学数学教师生成一段家校沟通话术，语气温和、清楚，长度控制在 150 字以内。内容包含：今天学了什么、孩子回家可以怎么复习、家长可以怎么陪伴，不要制造焦虑感。',
  recommendedTools: ['豆包', 'Kimi'],
  expectedOutput: '可直接发班级群或家校本的简洁通知',
  badges: ['家校沟通', '低负担'],
};

const promptBlackboard: PromptTemplateRecommendation = {
  key: 'prompt-blackboard',
  kind: 'prompt_template',
  title: '根据课件生成板书提纲',
  summary: '把一页页内容压缩成课堂板书逻辑，适合公开课和磨课。',
  useCase: '已经有课件，但板书结构还没定时使用。',
  prompt:
    '你现在是小学数学公开课指导老师。请根据【课件主要页面内容】, 为【课题】生成一份板书提纲。输出形式为“左区 - 中区 - 右区”或“主板书 - 副板书”，并说明每一部分应该在什么教学节点写出，确保板书能体现知识结构和方法路径。',
  recommendedTools: ['Kimi', '豆包', 'Gamma'],
  expectedOutput: '适合课堂书写的板书框架与出示顺序',
  badges: ['公开课', '板书优化'],
};

export const recommendationConfig: RecommendationPageConfig = {
  hero: {
    eyebrow: '本周备课主题',
    title: '先把“百分数、折扣与利率”这一单元备顺，再决定这节课要从哪一步切入',
    subtitle:
      '这里不是把资源重新排一遍，而是把一节课真正会用到的导入资源、讲解工具、提示词和外部网站放在一起，让老师少走一次来回切换的路。',
    focusLabel: '适合六年级百分数单元、公开课打磨与常规备课',
    resource: {
      key: 'hero-resource',
      kind: 'internal_resource',
      title: '利率课件',
      titleOverride: '利率课件',
      summary: '用一个完整课件带你快速搭好“百分数应用”这一节课的讲解骨架。',
      reason: '它适合承担主讲任务，逻辑稳定、切入自然，老师投屏时不用再解释太多操作步骤。',
      audience: '适合六年级新授课、公开课试讲与磨课',
      resourceRef: { routePath: '/llkj' },
      fallbackRefs: [{ routePath: '/ll' }],
      badges: ['整课可用', '讲解顺手'],
    },
    prompt: promptLessonPlan,
    extension: {
      key: 'hero-extension',
      kind: 'external_tool',
      title: '豆包',
      summary: '适合把课题、学情和课件内容快速整理成教案、提问链和练习建议。',
      url: 'https://www.doubao.com/',
      bestFor: '先出第一版教案和课堂活动清单，再回到你自己的教学风格里精修。',
      cautions: '不要直接整段照搬输出，尤其是目标、例题和评价语句需要结合本班情况调整。',
      access: '网页可直接使用，部分能力需登录',
      pairedPromptTitle: '40 分钟数学教案生成器',
      badges: ['通用 AI 助手', '适合中文教学场景'],
    },
  },
  teachingActions: [
    {
      key: 'open-lesson',
      title: '这节课怎么开场',
      subtitle: '先让学生看见变化，再进入定义和计算，课堂会更容易被带起来。',
      description: '这一区优先放“3 分钟内能把学生带入情境”的资源和提示词。',
      icon: Lightbulb,
      items: [
        {
          key: 'open-percentages',
          kind: 'internal_resource',
          title: '百分数浓度调节',
          titleOverride: '魔法药水浓度模拟器',
          summary: '用液体浓度变化做百分数导入，学生能很快把“占比变化”看明白。',
          reason: '适合导入和建立直觉，比直接讲定义更能抓住注意力。',
          audience: '六年级百分数新授课前 3-5 分钟',
          resourceRef: { routePath: '/nd' },
          fallbackRefs: [{ routePath: '/bfs' }],
          badges: ['导入优先', '直觉建立'],
        },
        {
          key: 'open-position',
          kind: 'internal_resource',
          title: '位置探索',
          summary: '在网格里快速建立“位置关系”和“数对定位”的画面感。',
          reason: '坐标和位置类知识很适合先让学生观察和操作，再讲规范表达。',
          audience: '四年级位置与方向、数对定位导入',
          resourceRef: { routePath: '/wz' },
          fallbackRefs: [{ routePath: '/sst' }],
          badges: ['空间感', '可投屏演示'],
        },
        {
          key: 'open-prompt',
          ...promptQuestions,
        },
      ],
    },
    {
      key: 'teach-through',
      title: '这节课怎么讲透',
      subtitle: '把关键过程讲成学生跟得上的路径，而不是只把结论展示出来。',
      description: '这一区优先放公式推导、结构讲解和板书辅助类内容。',
      icon: GraduationCap,
      items: [
        {
          key: 'teach-cylinder',
          kind: 'internal_resource',
          title: '圆柱体积推导',
          summary: '把切、拼、变形的过程连续展示出来，帮助学生理解公式从哪里来。',
          reason: '适合主讲过程，尤其是需要解释“为什么这样算”的课堂段落。',
          audience: '六年级空间与图形、公开课主讲段',
          resourceRef: { routePath: '/yztj' },
          fallbackRefs: [{ routePath: '/yzbm' }, { routePath: '/yzc' }],
          badges: ['公式推导', '过程可视化'],
        },
        {
          key: 'teach-interest',
          kind: 'internal_resource',
          title: '利率课件',
          summary: '把“本金、利率、存期、利息”的关系讲清楚，适合投屏主讲。',
          reason: '当你已经确定要讲透一个概念，课件型资源比轻互动更稳。',
          audience: '六年级百分数应用与利率专题',
          resourceRef: { routePath: '/llkj' },
          fallbackRefs: [{ routePath: '/ll' }],
          badges: ['主讲稳定', '结构清楚'],
        },
        {
          key: 'teach-blackboard',
          ...promptBlackboard,
        },
      ],
    },
    {
      key: 'save-time',
      title: '这节课怎么省时间',
      subtitle: '把重复劳动交给工具，把老师的精力留给真正需要判断和打磨的地方。',
      description: '这一区优先放提示词、AI 工具和现成教师网页。',
      icon: Sparkles,
      items: [
        {
          key: 'save-plan',
          ...promptLessonPlan,
        },
        {
          key: 'save-doubao',
          kind: 'external_tool',
          title: '豆包',
          summary: '中文表达自然，适合生成教案初稿、课堂提问和作业说明。',
          url: 'https://www.doubao.com/',
          bestFor: '先快速出版本，再用你的教学习惯做二次改写。',
          cautions: '不要直接采纳例题与数据，数学内容需要老师亲自核对准确性。',
          access: '网页可用，登录后体验更完整',
          pairedPromptTitle: '40 分钟数学教案生成器',
          badges: ['通用对话', '中文友好'],
        },
        {
          key: 'save-smartedu',
          kind: 'teacher_website',
          title: '国家中小学智慧教育平台',
          summary: '查课件、教案、精品课和教材配套资源时非常省时间。',
          url: 'https://basic.smartedu.cn/',
          bestFor: '当你需要找官方或规范化的教学参考材料时。',
          cautions: '适合做参考和补充，不建议整节课完全照搬现成设计。',
          access: '免费，部分资源需登录',
          pairedPromptTitle: '按课标改写教学目标',
          badges: ['官方资源', '教案课件'],
        },
      ],
    },
  ],
  promptTemplates: [
    promptLessonPlan,
    promptObjectives,
    promptQuestions,
    promptHomework,
    promptParents,
    promptBlackboard,
  ],
  aiTools: [
    {
      key: 'tool-doubao',
      kind: 'external_tool',
      title: '豆包',
      summary: '适合中文场景下的教案、活动设计、作业和通知初稿。',
      url: 'https://www.doubao.com/',
      bestFor: '备课起步、快速起草、把想法整理成结构化文本。',
      cautions: '数学表达、例题和结论一定要二次核对，别直接把原稿发给学生或家长。',
      access: '网页可用，登录后更完整',
      pairedPromptTitle: '40 分钟数学教案生成器',
      badges: ['教案初稿', '中文自然'],
    },
    {
      key: 'tool-kimi',
      kind: 'external_tool',
      title: 'Kimi',
      summary: '长文本理解能力更适合处理课标、教材摘录和较长的课件内容。',
      url: 'https://www.kimi.com/',
      bestFor: '把课标要求、教材内容和已有教案合并整理成清晰摘要。',
      cautions: '适合处理长内容，不一定是最快出短答案的工具。',
      access: '网页可用，登录后体验更稳定',
      pairedPromptTitle: '按课标改写教学目标',
      badges: ['长文总结', '课标梳理'],
    },
    {
      key: 'tool-tongyi',
      kind: 'external_tool',
      title: '通义千问',
      summary: '适合做分层练习、课堂问题改写和结构化输出。',
      url: 'https://tongyi.aliyun.com/qianwen/',
      bestFor: '需要清单式、表格式、分步骤输出时。',
      cautions: '输出很规整，但课堂语言可能偏书面，建议老师再润一下。',
      access: '网页可用，登录后更完整',
      pairedPromptTitle: '分层作业设计助手',
      badges: ['结构化输出', '练习设计'],
    },
    {
      key: 'tool-gamma',
      kind: 'external_tool',
      title: 'Gamma',
      summary: '适合把一份教案或提纲快速转成可展示的讲稿与页面结构。',
      url: 'https://gamma.app/',
      bestFor: '公开课汇报、讲座分享、需要快速出一版展示材料时。',
      cautions: '适合出结构和版式，不适合直接代替数学教学内容的严谨打磨。',
      access: '网页可用，部分高级能力需登录',
      pairedPromptTitle: '根据课件生成板书提纲',
      badges: ['PPT 生成', '展示稿'],
    },
    {
      key: 'tool-canva',
      kind: 'external_tool',
      title: 'Canva',
      summary: '适合把课堂活动、讲义封面、海报或可视化素材做得更完整。',
      url: 'https://www.canva.com/',
      bestFor: '课件美化、课堂活动单、家长会海报、学科活动物料。',
      cautions: '视觉很强，但教学结构仍要先由老师自己定好，不要先迷失在排版里。',
      access: '网页可用，部分模板需登录',
      pairedPromptTitle: '40 分钟数学教案生成器',
      badges: ['课件美化', '视觉辅助'],
    },
    {
      key: 'tool-jimeng',
      kind: 'external_tool',
      title: '即梦 AI',
      summary: '适合生成课堂情境图、主题插画和活动页背景。',
      url: 'https://jimeng.jianying.com/',
      bestFor: '想给课件加情境图、角色图或节日活动图时。',
      cautions: '图片只适合做辅助情境，不能代替数学内容本身的准确表达。',
      access: '网页可用，登录后使用',
      pairedPromptTitle: '家校沟通话术生成',
      badges: ['图片生成', '情境创设'],
    },
    {
      key: 'tool-metaso',
      kind: 'external_tool',
      title: '秘塔 AI 搜索',
      summary: '适合先查资料、再让 AI 整理，减少“凭空生成”的风险。',
      url: 'https://metaso.cn/',
      bestFor: '找课标依据、题目背景资料、案例说明和网页信息汇总。',
      cautions: '搜索结果仍需老师自己判断来源可靠性，尤其是教辅和题目网页。',
      access: '网页可直接使用',
      pairedPromptTitle: '课堂提问链生成器',
      badges: ['资料搜索', '减少幻觉'],
    },
  ],
  teacherWebsites: [
    {
      key: 'site-smartedu',
      kind: 'teacher_website',
      title: '国家中小学智慧教育平台',
      summary: '一站式看教案、课件、精品课和配套教学资源。',
      url: 'https://basic.smartedu.cn/',
      bestFor: '找规范化参考材料、精品课案例、课后补充资源。',
      cautions: '适合做参考模板，不建议整节课完全照搬。',
      access: '免费，部分内容需登录',
      pairedPromptTitle: '按课标改写教学目标',
      badges: ['教案课件', '官方资源'],
    },
    {
      key: 'site-pep',
      kind: 'teacher_website',
      title: '人民教育出版社',
      summary: '查教材体系、配套资源和教材相关说明时很实用。',
      url: 'https://www.pep.com.cn/',
      bestFor: '对照教材表达、章节安排和教材配套资料。',
      cautions: '更适合做教材查阅与核对，不是快速找课堂活动的入口。',
      access: '免费，网页访问',
      pairedPromptTitle: '根据课件生成板书提纲',
      badges: ['教材查阅', '课标教材'],
    },
    {
      key: 'site-zxxk',
      kind: 'teacher_website',
      title: '学科网',
      summary: '适合查试题、课件、讲义和同课题素材，尤其在出练习时效率很高。',
      url: 'https://www.zxxk.com/',
      bestFor: '补充习题、找同类型课件、寻找课堂素材灵感。',
      cautions: '免费与付费内容混合，下载或深用前要看权限和版权。',
      access: '部分免费，常用功能需登录',
      pairedPromptTitle: '分层作业设计助手',
      badges: ['题目素材', '备课搜索'],
    },
  ],
  collections: [
    {
      sectionId: 'percent-discount',
      title: '百分数与折扣',
      subtitle: '从看得见的变化，到生活中的实际应用。',
      description: '适合六年级百分数单元，先建概念，再过渡到折扣、利率和实际问题。',
      items: [
        {
          key: 'collection-percent-intro',
          kind: 'internal_resource',
          title: '百分数浓度调节',
          titleOverride: '魔法药水浓度模拟器',
          summary: '先用“液体越来越浓/越来越淡”的变化，帮学生建立百分数直觉。',
          reason: '导入要先让学生看到变化，后面再进入抽象表达会更自然。',
          audience: '六年级百分数导入',
          resourceRef: { routePath: '/nd' },
          fallbackRefs: [{ routePath: '/bfs' }],
          badges: ['导入', '直觉'],
        },
        {
          key: 'collection-percent-explain',
          kind: 'internal_resource',
          title: '百分数的意义',
          summary: '用百格图和生活化模型把百分数真正讲清楚。',
          reason: '这是把“看见变化”过渡到“说清定义”的关键一步。',
          audience: '六年级百分数新授',
          resourceRef: { routePath: '/bfs' },
          badges: ['讲解', '概念'],
        },
        {
          key: 'collection-percent-prompt',
          ...promptHomework,
        },
        {
          key: 'collection-percent-tool',
          kind: 'external_tool',
          title: '豆包',
          summary: '用来快速生成百分数单元的分层练习和课后巩固任务。',
          url: 'https://www.doubao.com/',
          bestFor: '补一份差异化练习或课后讲评提纲。',
          cautions: '题目难度和计算数据要人工校对。',
          access: '网页可用，登录后体验更完整',
          pairedPromptTitle: '分层作业设计助手',
          badges: ['练习生成', '节省时间'],
        },
      ],
    },
    {
      sectionId: 'ratio-mixture',
      title: '比与配比',
      subtitle: '从“两个量的关系”走向更真实的配比判断。',
      description: '适合把“比的意义”和“比例/配比”做成一条更完整的课堂线索。',
      items: [
        {
          key: 'collection-ratio-intro',
          kind: 'internal_resource',
          title: '比的意义',
          summary: '用实验感强的形式帮助学生先感受“两个量的对应关系”。',
          reason: '比最怕只停留在记法，这个资源更适合先讲关系再讲表示。',
          audience: '六年级比的意义新授',
          resourceRef: { routePath: '/bd' },
          badges: ['导入', '关系建立'],
        },
        {
          key: 'collection-ratio-explain',
          kind: 'internal_resource',
          title: '利率',
          summary: '把百分数关系放进真实数量情境里，帮助学生理解“率”的表达。',
          reason: '比、百分数、利率之间有天然联系，适合做迁移与拓展。',
          audience: '六年级综合应用',
          resourceRef: { routePath: '/ll' },
          fallbackRefs: [{ routePath: '/llkj' }],
          badges: ['应用迁移', '生活情境'],
        },
        {
          key: 'collection-ratio-prompt',
          ...promptQuestions,
        },
        {
          key: 'collection-ratio-website',
          kind: 'teacher_website',
          title: '国家中小学智慧教育平台',
          summary: '适合补充同主题课例与教学设计参考。',
          url: 'https://basic.smartedu.cn/',
          bestFor: '看看别人是怎么处理“比与比例”这种抽象知识点的。',
          cautions: '参考结构即可，别把别人的活动流程直接照搬到自己的班。',
          access: '免费，部分资源需登录',
          pairedPromptTitle: '课堂提问链生成器',
          badges: ['课例参考', '教学设计'],
        },
      ],
    },
    {
      sectionId: 'cylinder-circle',
      title: '圆柱与圆',
      subtitle: '把“圆”和“圆柱”的推导过程讲成连续的思考路径。',
      description: '适合公式推导课、公开课和需要加强空间想象的课堂。',
      items: [
        {
          key: 'collection-circle-intro',
          kind: 'internal_resource',
          title: '圆的周长推导',
          summary: '先从滚动与展开切入，让学生看到“圆周长从哪里来”。',
          reason: '圆类知识适合先从动态变化引入，再讲公式更顺。',
          audience: '六年级圆单元',
          resourceRef: { routePath: '/yzc' },
          badges: ['导入', '变化过程'],
        },
        {
          key: 'collection-cylinder-explain',
          kind: 'internal_resource',
          title: '圆柱表面积推导',
          summary: '把展开、拼合与面积计算对应起来，适合主讲推导。',
          reason: '这一类课最适合用连续过程而不是只放结论。',
          audience: '六年级圆柱专题',
          resourceRef: { routePath: '/yzbm' },
          fallbackRefs: [{ routePath: '/yztj' }],
          badges: ['讲解', '推导'],
        },
        {
          key: 'collection-cylinder-prompt',
          ...promptBlackboard,
        },
        {
          key: 'collection-cylinder-tool',
          kind: 'external_tool',
          title: 'Gamma',
          summary: '适合把圆柱和圆的推导逻辑整理成汇报稿或公开课展示版式。',
          url: 'https://gamma.app/',
          bestFor: '公开课说课、教研分享、磨课展示。',
          cautions: '页面好看不等于教学更清楚，逻辑仍要老师先确定。',
          access: '网页可用，部分高级功能需登录',
          pairedPromptTitle: '根据课件生成板书提纲',
          badges: ['公开课汇报', '版式辅助'],
        },
      ],
    },
    {
      sectionId: 'space-observation',
      title: '空间与图形观察',
      subtitle: '把“观察角度”和“空间关系”讲得更具体、更可操作。',
      description: '适合三视图、位置、图形运动和空间感培养类课堂。',
      items: [
        {
          key: 'collection-space-intro',
          kind: 'internal_resource',
          title: '三视图教学',
          summary: '先让学生转动和观察，再进入“从不同方向看到什么”。',
          reason: '空间想象最怕口头描述，三视图更适合先做可视化演示。',
          audience: '六年级三视图、空间观察',
          resourceRef: { routePath: '/sst' },
          badges: ['导入', '空间想象'],
        },
        {
          key: 'collection-space-explain',
          kind: 'internal_resource',
          title: '平移与旋转工坊',
          summary: '用操作让学生把图形运动和结果变化对应起来。',
          reason: '图形运动类知识适合“操作 - 观察 - 归纳”的节奏。',
          audience: '三四年级图形运动专题',
          resourceRef: { routePath: '/pyxz' },
          fallbackRefs: [{ routePath: '/wz' }],
          badges: ['讲解', '操作观察'],
        },
        {
          key: 'collection-space-prompt',
          ...promptObjectives,
        },
        {
          key: 'collection-space-website',
          kind: 'teacher_website',
          title: '人民教育出版社',
          summary: '适合回看教材编排与章节内容，帮助梳理空间与图形的知识梯度。',
          url: 'https://www.pep.com.cn/',
          bestFor: '备课前先对照教材与编排逻辑。',
          cautions: '更适合查教材和参考资料，不适合直接替代课堂互动资源。',
          access: '免费，网页访问',
          pairedPromptTitle: '按课标改写教学目标',
          badges: ['教材查阅', '结构梳理'],
        },
      ],
    },
  ],
  teachingTips: [
    {
      key: 'tip-1',
      title: '推荐页要帮老师少做一次判断',
      description: '每张卡都应该回答“什么时候用、为什么用、点进去能得到什么”，而不是只展示标题。',
      icon: Compass,
    },
    {
      key: 'tip-2',
      title: '先给老师一条教学线，再给一堆资源',
      description: '导入、讲解、练习、家校沟通这几步如果能串起来，推荐页就会比资源库更有价值。',
      icon: Target,
    },
    {
      key: 'tip-3',
      title: '把 AI 当助手，不把判断权交出去',
      description: '推荐工具是为了节省重复劳动，不是为了替代老师对目标、例题和学生情况的专业判断。',
      icon: WandSparkles,
    },
  ],
};
