import * as VRouter from "vue-router"
const env = import.meta.env.MODE;
import config from "./config.js"

const router = VRouter.createRouter({
    routes:config,
    history:VRouter.createWebHistory()
});

router.beforeEach((to, from, next)=>{

    next();
})
router.afterEach((to)=>{

})
export default router;
