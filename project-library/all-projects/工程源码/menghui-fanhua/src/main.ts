import "./styles.css";
import { createRouteSequence } from "./core/models";
import { lesson } from "./data/lesson";
import { BrowserImagePreloader } from "./services/assets";
import { LazyPanoramaViewer } from "./services/lazy-panorama";
import { HashNavigation } from "./services/navigation";
import { LessonRenderer } from "./views/lesson-renderer";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("App root was not found.");

const navigation = new HashNavigation(createRouteSequence(lesson));
const renderer = new LessonRenderer(
  root,
  lesson,
  navigation,
  () => new LazyPanoramaViewer(),
);

navigation.subscribe((route) => renderer.render(route));
navigation.start();

const preloader = new BrowserImagePreloader();
void preloader.preload([
  lesson.cover,
  lesson.fullScroll,
  ...lesson.scenes.map((scene) => scene.thumbnail),
]);
