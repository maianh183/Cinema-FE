import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',outputDir:'test-results/e2e',timeout:45000,fullyParallel:false,workers:1,
 reporter:[['list'],['html',{open:'never',outputFolder:'playwright-report'}]],
 use:{baseURL:'http://127.0.0.1:3001',headless:true,channel:'msedge',viewport:{width:1440,height:1000},screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --strictPort',env:{VITE_USE_MOCK:'true'},url:'http://127.0.0.1:3001',reuseExistingServer:false,timeout:60000},
});

