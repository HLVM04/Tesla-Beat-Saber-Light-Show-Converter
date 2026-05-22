import "./style.css";
import { AppController } from "./app/app-controller";

document.addEventListener("DOMContentLoaded", () => {
  new AppController().init();
});
