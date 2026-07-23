# Room Announcer 插件

实时监测公开房间列表，当房间列表变化时自动向未在房间中的玩家播报。

## 功能特性

- ✅ **实时监测** - 定时检测房间列表变化
- ✅ **智能播报** - 只向未进入房间的玩家播报
- ✅ **事件触发** - 房间创建/加入/离开时立即检测
- ✅ **登录播报** - 玩家登录时自动向该玩家播报房间列表
- ✅ **可配置** - 支持自定义检测间隔、播报格式等

## 配置方法

在 `config/room-announcer/config.yaml` 中配置：

```yaml
# 是否启用插件
enabled: true

# 检测间隔（毫秒）
checkInterval: 5000

# 玩家登录时是否播报房间列表
announceOnJoin: true

# 登录播报延迟（毫秒）
announceDelay: 1500

# 是否显示房间人数
showPlayerCount: true

# 是否显示房间状态
showRoomState: true

# 是否只播报公开房间
publicOnly: true

# 公开房间前缀
publicPrefix: 'pub'

# 播报消息前缀
messagePrefix: '【房间播报】'
```

## 配置项说明

| 配置项            | 类型    | 默认值           | 说明                 |
| ----------------- | ------- | ---------------- | -------------------- |
| `enabled`         | boolean | `true`           | 是否启用插件         |
| `checkInterval`   | number  | `5000`           | 检测间隔（毫秒）     |
| `announceOnJoin`  | boolean | `true`           | 玩家登录时是否播报   |
| `announceDelay`   | number  | `1500`           | 登录播报延迟（毫秒） |
| `showPlayerCount` | boolean | `true`           | 是否显示房间人数     |
| `showRoomState`   | boolean | `true`           | 是否显示房间状态     |
| `publicOnly`      | boolean | `true`           | 是否只播报公开房间   |
| `publicPrefix`    | string  | `"pub"`          | 公开房间前缀         |
| `messagePrefix`   | string  | `"【房间播报】"` | 播报消息前缀         |

## 控制台命令

插件注册了以下控制台命令：

### /roomlist

显示当前房间列表（仅控制台可见）

```
/roomlist
```

### /roomannouncer

管理插件状态

```
/roomannouncer status     # 查看插件状态
/roomannouncer announce   # 手动触发播报
```

## 播报触发条件

插件会在以下情况检测房间变化并播报：

1. **定时检测** - 每隔 `checkInterval` 毫秒检测一次
2. **房间创建** - 有新房间创建时
3. **玩家加入** - 有玩家加入房间时
4. **玩家离开** - 有玩家离开房间时
5. **玩家登录** - 新玩家鉴权成功后（延迟 `announceDelay` 毫秒）向该玩家播报

## 播报内容示例

```
【房间播报】 当前公开房间列表：
🏠 Test Room (3/8) [选曲中]
🏠 Fun Room (5/8) [游戏中]
🏠 New Room (1/8) [选曲中] 🔒

输入房间号即可加入房间
```

## 玩家登录播报

当新玩家鉴权成功后，插件会：

1. 等待 `announceDelay` 毫秒（默认 1500ms），确保玩家已完全加载
2. 生成当前房间列表消息
3. 通过 WebSocket 向该玩家发送房间列表
4. 客户端收到后显示房间列表，方便玩家选择房间加入

这个功能可以帮助新加入的玩家快速了解当前服务器的房间情况。

## 工作原理

1. 插件启动时记录当前房间列表快照
2. 每隔 `checkInterval` 毫秒检测房间列表变化
3. 当房间创建/加入/离开时立即检测
4. 检测到变化时，向所有未在房间中的玩家广播消息
5. 当新玩家鉴权成功时，延迟 `announceDelay` 毫秒后向该玩家发送房间列表

## 注意事项

- 插件使用 `broadcastWs` 广播消息，客户端需要处理 `room:announcement` 事件
- 如果没有公开房间，插件不会播报
- 检测间隔不宜过短，以免影响服务器性能

## 开发者信息

- **插件 ID**: room-announcer
- **UUID**: f8a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c
- **版本**: 1.0.0
- **依赖**: websocket (c8d4e5f6-9a2b-4c7d-8e1f-3a9b6c5d7e2a)
