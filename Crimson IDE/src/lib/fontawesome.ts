/**
 * Centralized FontAwesome Icons Registry
 * Ensures 100% FontAwesome usage across the entire IDE (NO EMOJIS EVER)
 */

import {
  faFolder,
  faFolderOpen,
  faFile,
  faFileCode,
  faFileLines,
  faTerminal,
  faGear,
  faMagnifyingGlass,
  faCodeBranch,
  faCodeCompare,
  faPuzzlePiece,
  faCloud,
  faCloudArrowUp,
  faCloudArrowDown,
  faRotate,
  faClock,
  faCalendarDays,
  faPlay,
  faPlus,
  faMinus,
  faXmark,
  faCheck,
  faCheckDouble,
  faFlask,
  faVial,
  faTriangleExclamation,
  faCircleExclamation,
  faCircleInfo,
  faColumns,
  faTableColumns,
  faWindowMinimize,
  faWindowMaximize,
  faWindowRestore,
  faBars,
  faChevronRight,
  faChevronDown,
  faChevronUp,
  faArrowUp,
  faArrowDown,
  faTrashCan,
  faPenToSquare,
  faCopy,
  faLaptop,
  faDesktop,
  faMobileScreen,
  faKey,
  faShieldHalved,
  faPalette,
  faSliders,
  faFont,
  faKeyboard,
  faEllipsisVertical,
  faBolt,
  faCode,
  faHashtag,
  faQuoteRight,
  faListUl,
  faDownload,
  faCircleCheck,
  faEye,
  faEyeSlash,
  faArrowsSplitUpAndLeft,
  faArrowsRotate,
  faShareNodes,
  faDatabase,
  faServer,
  faWrench,
  faBug,
  faBoxArchive,
  faLock,
  faClockRotateLeft,
  faLayerGroup,
  faWandMagicSparkles,
  faRobot,
  faStar,
  faLightbulb,
  faCube,
  faCubes,
  faUpload,
  faLocationCrosshairs,
  faStore,
  faTag,
  faMicrochip,
  faFilter,
  faPaperPlane,
  faArrowUpRightFromSquare,
  faCircleQuestion,
  faStop,
  faCompress,
  faExpand,
  faAnglesDown,
  faAnglesUp,
  faArrowLeft,
  faArrowRight,
  faArrowsLeftRight,
  faGripVertical,
  faBorderAll,
  faUpDownLeftRight,
  faRotateLeft,
  faChartBar,
  faBookOpen,
  faMicrophone,
  faMicrophoneSlash,
  faThumbtack,
  faLink,
  faUnlink,
  faBookmark,
  faLocationDot,
  faVolumeHigh,
  faVolumeXmark,
  faPaintbrush,
  faImage
} from '@fortawesome/free-solid-svg-icons';

import {
  faJs,
  faPython,
  faRust,
  faHtml5,
  faCss3Alt,
  faReact,
  faGitAlt,
  faGithub,
  faDocker,
  faMarkdown
} from '@fortawesome/free-brands-svg-icons';

import { LanguageId } from '../types';

export const ICONS = {
  folder: faFolder,
  folderOpen: faFolderOpen,
  file: faFile,
  fileCode: faFileCode,
  fileLines: faFileLines,
  terminal: faTerminal,
  settings: faGear,
  search: faMagnifyingGlass,
  git: faCodeBranch,
  gitAlt: faGitAlt,
  gitCompare: faCodeCompare,
  plugins: faPuzzlePiece,
  cloud: faCloud,
  cloudUp: faCloudArrowUp,
  cloudDown: faCloudArrowDown,
  sync: faRotate,
  syncSpin: faArrowsRotate,
  play: faPlay,
  plus: faPlus,
  minus: faMinus,
  close: faXmark,
  check: faCheck,
  checkDouble: faCheckDouble,
  flask: faFlask,
  vial: faVial,
  warning: faTriangleExclamation,
  error: faCircleExclamation,
  info: faCircleInfo,
  splitVertical: faColumns,
  splitHorizontal: faTableColumns,
  minimize: faWindowMinimize,
  maximize: faWindowMaximize,
  restore: faWindowRestore,
  menu: faBars,
  chevronRight: faChevronRight,
  chevronDown: faChevronDown,
  chevronUp: faChevronUp,
  fold: faCompress,
  unfold: faExpand,
  expand: faExpand,
  compress: faCompress,
  foldAll: faAnglesUp,
  unfoldAll: faAnglesDown,
  arrowUp: faArrowUp,
  arrowDown: faArrowDown,
  trash: faTrashCan,
  edit: faPenToSquare,
  copy: faCopy,
  laptop: faLaptop,
  desktop: faDesktop,
  mobile: faMobileScreen,
  key: faKey,
  shield: faShieldHalved,
  palette: faPalette,
  sliders: faSliders,
  font: faFont,
  keyboard: faKeyboard,
  more: faEllipsisVertical,
  bolt: faBolt,
  code: faCode,
  hashtag: faHashtag,
  quote: faQuoteRight,
  list: faListUl,
  download: faDownload,
  circleCheck: faCircleCheck,
  eye: faEye,
  eyeSlash: faEyeSlash,
  database: faDatabase,
  server: faServer,
  wrench: faWrench,
  bug: faBug,
  archive: faBoxArchive,
  lock: faLock,
  history: faClockRotateLeft,
  clock: faClock,
  calendar: faCalendarDays,
  layerGroup: faLayerGroup,
  wand: faWandMagicSparkles,
  robot: faRobot,
  star: faStar,
  lightbulb: faLightbulb,
  cube: faCube,
  cubes: faCubes,
  upload: faUpload,
  target: faLocationCrosshairs,
  store: faStore,
  tag: faTag,
  chip: faMicrochip,
  filter: faFilter,
  send: faPaperPlane,
  external: faArrowUpRightFromSquare,
  question: faCircleQuestion,
  stop: faStop,
  arrowLeft: faArrowLeft,
  arrowRight: faArrowRight,
  swap: faArrowsLeftRight,
  arrowsLeftRight: faArrowsLeftRight,
  grip: faGripVertical,
  layout: faBorderAll,
  move: faUpDownLeftRight,
  reset: faRotateLeft,
  rotateLeft: faRotateLeft,
  pen: faPenToSquare,
  pin: faThumbtack,
  thumbtack: faThumbtack,
  chartBar: faChartBar,
  bookOpen: faBookOpen,
  sparkles: faWandMagicSparkles,
  infoCircle: faCircleInfo,
  microphone: faMicrophone,
  microphoneSlash: faMicrophoneSlash,
  references: faShareNodes,
  link: faLink,
  unlink: faUnlink,
  bookmark: faBookmark,
  location: faLocationDot,
  react: faReact,
  github: faGithub,
  python: faPython,
  rust: faRust,
  js: faJs,
  html: faHtml5,
  css: faCss3Alt,
  docker: faDocker,
  markdown: faMarkdown,
  volume: faVolumeHigh,
  volumeMute: faVolumeXmark,
  paintbrush: faPaintbrush,
  image: faImage,
};

/**
 * Returns the appropriate FontAwesome icon and crimson-accented color for a file
 */
export function getFileIconConfig(fileName: string, language?: LanguageId) {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
      return { icon: faReact, color: 'text-rose-400' };
    case 'js':
    case 'jsx':
    case 'mjs':
      return { icon: faJs, color: 'text-amber-400' };
    case 'py':
      return { icon: faPython, color: 'text-emerald-400' };
    case 'rs':
      return { icon: faRust, color: 'text-orange-400' };
    case 'html':
      return { icon: faHtml5, color: 'text-red-500' };
    case 'css':
    case 'scss':
      return { icon: faCss3Alt, color: 'text-pink-400' };
    case 'json':
      return { icon: faCode, color: 'text-rose-300' };
    case 'md':
      return { icon: faMarkdown, color: 'text-slate-300' };
    case 'sh':
    case 'bash':
    case 'zsh':
      return { icon: faTerminal, color: 'text-emerald-300' };
    case 'sql':
      return { icon: faDatabase, color: 'text-rose-400' };
    case 'yml':
    case 'yaml':
      return { icon: faSliders, color: 'text-rose-200' };
    case 'cpp':
    case 'c':
    case 'h':
      return { icon: faCode, color: 'text-rose-500' };
    case 'dockerfile':
      return { icon: faDocker, color: 'text-rose-300' };
    default:
      return { icon: faFileLines, color: 'text-slate-400' };
  }
}
