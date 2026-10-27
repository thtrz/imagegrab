# 图提取 ImageGrab｜作业项目

这个项目包含两个成果：Chrome 电商图片提取下载插件，以及放在 docs 中的静态宣传官网。

运行插件和官网不需要 Cursor、不需要 Node.js、不需要 AI API 或额度。Cursor 可以用于查看或修改代码。

## 一、先安装插件

1. 完整解压项目 ZIP，放到一个固定文件夹，例如 D:\ImageGrab。
2. 打开桌面版 Chrome（116 及以上），在地址栏输入 chrome://extensions 并回车。
3. 打开右上角“开发者模式”，点击“加载已解压的扩展程序”。
4. 选择直接包含 manifest.json 的 ImageGrab 文件夹。
5. 扩展列表中出现“图提取 · ImageGrab”后，在工具栏的拼图菜单中将它固定。
6. 如果安装完成前已经打开了商品页面，请先刷新页面。

若使用官网下载的 imagegrab-extension.zip，也要先解压，再选择含 manifest.json 的文件夹。不能直接选择 ZIP 文件。

## 二、使用并拍摄真实截图

1. 正常访问淘宝 / 天猫、京东或拼多多商家版的商品详情页；网站要求登录时，使用你自己的账号登录。
2. 手动向下滚动，展开详情并等待图片加载。
3. 点击页面右下角“获取图片”。若网站改版后未自动识别详情页，可以在该网站点击工具栏的扩展图标手动扫描。
4. 在新打开的图片工作台中，查看缩略图、尺寸与原图链接，勾选需要的图片。支持全选可见图片、反选和尺寸筛选。
5. 点击“下载选中图片”。浏览器可能询问选中图片 CDN 域名的访问权限，请确认后允许。
6. 保持工作台打开，等待结果。图片真正转换为 PNG 后保存至默认下载目录的 ImageGrab/日期/ 文件夹，名称类似“商品图_001.png”。
7. 拍下商品页按钮、图片工作台，以及下载成功后本地 PNG 文件的截图。不要把官网的界面示意图当作真实运行截图提交。

## 三、本地预览官网

双击 docs/index.html 即可，无需启动服务器或安装依赖。

- 首页文案：docs/index.html
- 主色、间距、圆角与布局：docs/css/style.css 顶部 :root
- 导航、复制与滚动动效：docs/js/main.js
- 官网下载按钮：docs/downloads/imagegrab-extension.zip
- 网站图形由 CSS 和本地 SVG 绘制，不依赖外部图片或 CDN。
- 手机端能查看官网，插件本身需要桌面版 Chrome。

## 四、把项目推送到 GitHub（云端代码）

1. 注册或登录自己的 GitHub 账号，新建一个仓库，例如 imagegrab。免费 GitHub Pages 的常用做法是创建公开仓库；不要上传密码、令牌或私人截图。
2. 在 Cursor 中打开解压后的项目文件夹，确认已经安装 Git；若刚安装 Git，请重启 Cursor。
3. 使用源代码管理界面初始化仓库、暂存、提交；也可以在项目终端依次执行下列命令。把仓库地址改为你自己的地址。

    git init
    git add .
    git commit -m "完成图提取插件与官网"
    git branch -M main
    git remote add origin https://github.com/你的用户名/imagegrab.git
    git push -u origin main

4. 按 Git 或编辑器提示在浏览器登录 GitHub。不要把密码、访问令牌发到聊天中，也不要写入仓库地址。
5. 若首次提交提示身份未设置，先设置本项目的作者信息，然后重新提交：

    git config user.name "你的名字"
    git config user.email "你在 GitHub 使用的邮箱或隐私邮箱"

6. 推送后在 GitHub 网页打开仓库，确认能看到 manifest.json、docs 等文件，截图留存。

项目是一个新目录。若你已经关联了远程仓库，不要重复执行 remote add，先检查现有配置。

## 五、部署官网（GitHub Pages）

1. 打开刚才的 GitHub 仓库，进入 Settings → Pages。
2. 在 Build and deployment 中选择 Deploy from a branch。
3. 分支选择 main，目录选择 /docs，点击 Save。
4. 等待 Pages 构建完成，打开页面显示的实际网址，通常类似 https://你的用户名.github.io/imagegrab/。
5. 确认页面样式正常，点击“下载插件”可以下载 ZIP。
6. 截图时把浏览器地址栏和官网页面一起截进去。此处一般可用 GitHub 提供的网址，不需要另买域名；若老师明确要求自有域名，以老师要求为准。

GitHub 仓库负责保存代码；Pages 负责把 docs 变成网站。Chrome 插件在本机安装运行，不能通过访问官网自动安装。

## 六、按表单准备材料

详见《提交截图清单.md》。目前只看到了表单的 03—06，01、02 尚不确定。

## 七、测试状态与限制

- 已完成哪些程序化检查，以《验证说明.md》为准。
- 未在已登录的淘宝 / 京东 / 拼多多真实页面完成端到端实测；生成代码不代表所有站点都已验证通过。请按第二节实际测试，有报错可发回本聊天继续修复。
- 网站改版、懒加载、防盗链、登录校验、跨域 iframe 等情况可能影响图片完整性。插件不会绕过网站限制。
- 扫描只处理 HTTP/HTTPS 图片地址；过滤完全相同的 URL，不会把同一图片的所有尺寸版本都合并。
- 一次最多整理 800 张图片，背景扫描最多 20,000 个元素。
- 源图和转换后 PNG 均不超过 35 MB，像素总数不超过 4000 万；大图可能因此被跳过。
- 动态图转换为静态 PNG。并非所有非商品图都能自动识别，下载前请人工筛选。
- 扫描结果只保留在浏览器会话中，最近五次记录可用；浏览器重启后需要重新获取。
- 批量下载按顺序进行；停止按钮在当前图片处理后生效。浏览器仍可能按自身设置显示下载提示。
- 保存失败会展示原因并保留勾选。超时后请先在浏览器下载记录确认结果，再决定是否重试。
- 插件只从商品网站或图片 CDN 取得图片，不上传扫描记录，也不使用任何 AI 接口。

## 文件结构

    ImageGrab/
    ├── manifest.json
    ├── background.js
    ├── content.js / content.css
    ├── gallery.html / gallery.js / gallery.css
    ├── help.html / help.js
    ├── lib/core.js
    ├── icons/
    ├── docs/
    │   ├── index.html
    │   ├── css/style.css
    │   ├── js/main.js
    │   ├── assets/logo.svg
    │   └── downloads/imagegrab-extension.zip
    ├── README-先看这里.md
    ├── 需求分析与实现方案.md
    ├── 提交截图清单.md
    └── 验证说明.md

修改插件后，到 chrome://extensions 点击扩展卡片上的刷新按钮，再刷新商品页面。修改官网后，重新提交并推送，等待 Pages 更新。若修改了插件代码，也需要重新打包 docs/downloads 中供网站下载的插件 ZIP。
