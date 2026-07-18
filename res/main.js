"use strict";
/**
 * Room Announcer 插件
 *
 * 实时监测公开房间列表，当房间列表变化时自动向未在房间中的玩家播报。
 *
 * 功能特性：
 * - 定时检测房间列表变化
 * - 只向未进入房间的玩家播报
 * - 支持配置检测间隔和播报格式
 * - 可配置只播报公开房间（带特定前缀）
 *
 * 配置项 (config/room-announcer/config.yaml):
 * - enabled: 是否启用插件（默认 true）
 * - checkInterval: 检测间隔毫秒数（默认 5000）
 * - announceOnJoin: 玩家登录时是否播报（默认 true）
 * - showPlayerCount: 是否显示房间人数（默认 true）
 * - showRoomState: 是否显示房间状态（默认 true）
 * - publicOnly: 是否只播报公开房间（默认 false）
 * - publicPrefix: 公开房间前缀（默认 "pub"）
 * - messagePrefix: 消息前缀（默认 "【房间播报】"）
 */
Object.defineProperty(exports, "__esModule", { value: true });
const unsubscribers = [];
let checkTimer = null;
let lastRoomSnapshot = '';
const pluginModule = {
    name: 'room-announcer',
    async init(api) {
        // 读取配置
        const cfg = api.readPluginConfig() ?? {};
        const enabled = cfg.enabled ?? true;
        const checkInterval = cfg.checkInterval ?? 5000;
        const announceOnJoin = cfg.announceOnJoin ?? true;
        const announceDelay = cfg.announceDelay ?? 1500;
        const showPlayerCount = cfg.showPlayerCount ?? true;
        const showRoomState = cfg.showRoomState ?? true;
        // 参考 Web Dashboard 的房间过滤逻辑
        const enablePubWeb = cfg.enablePubWeb ?? false;
        const pubPrefix = cfg.pubPrefix ?? 'pub';
        const enablePriWeb = cfg.enablePriWeb ?? false;
        const priPrefix = cfg.priPrefix ?? 'sm';
        const messagePrefix = cfg.messagePrefix ?? '【房间播报】';
        if (!enabled) {
            api.logger.info('[RoomAnnouncer] 插件已禁用');
            return;
        }
        // 房间过滤函数（参考 Web Dashboard）
        function filterRooms(rooms) {
            return rooms.filter(room => {
                // 如果启用了公开房间过滤，只显示以 pubPrefix 开头的房间
                if (enablePubWeb) {
                    return room.id.startsWith(pubPrefix);
                }
                // 如果启用了私密房间过滤，隐藏以 priPrefix 开头的房间
                if (enablePriWeb) {
                    return !room.id.startsWith(priPrefix);
                }
                // 默认显示所有房间
                return true;
            });
        }
        // 获取房间状态文本
        function getRoomStateText(state) {
            switch (state) {
                case 'SelectChart':
                    return '选曲中';
                case 'WaitingForReady':
                    return '等待准备';
                case 'Playing':
                    return '游戏中';
                default:
                    return '';
            }
        }
        // 生成房间列表消息
        function generateRoomListMessage() {
            // 使用新的 API 获取房间列表并过滤
            const rooms = filterRooms(api.getRooms());
            if (rooms.length === 0) {
                return null;
            }
            const lines = [`\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n${messagePrefix} 当前公开房间列表：`];
            for (const room of rooms) {
                const parts = [];
                // 房间名
                parts.push(`🏠 ${room.name}`);
                // 人数
                if (showPlayerCount) {
                    parts.push(`(${room.playerCount}/${room.maxPlayers})`);
                }
                // 状态
                if (showRoomState) {
                    const stateStr = getRoomStateText(room.state);
                    if (stateStr) {
                        parts.push(`[${stateStr}]`);
                    }
                }
                // 锁定状态
                if (room.locked) {
                    parts.push('🔒');
                }
                lines.push(parts.join(' '));
            }
            lines.push('');
            lines.push('输入房间号即可加入房间');
            return lines.join('\n');
        }
        // 获取房间快照
        function getRoomSnapshot() {
            const rooms = filterRooms(api.getRooms())
                .map(room => ({
                id: room.id,
                name: room.name,
                playerCount: room.playerCount,
                maxPlayers: room.maxPlayers,
                locked: room.locked,
                state: room.state,
            }));
            return JSON.stringify(rooms);
        }
        // 获取未在房间中的玩家列表
        function getPlayersNotInRoom() {
            // 使用新的 API 获取在线玩家
            const allPlayers = api.getOnlinePlayers();
            // 过滤出未在房间中的玩家
            return allPlayers
                .filter(player => !player.roomId)
                .map(player => ({ id: player.id, name: player.name }));
        }
        // 向未在房间中的玩家播报房间列表
        function announceRoomList() {
            const message = generateRoomListMessage();
            const content = message ?? `\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n${messagePrefix} 当前没有公开房间`;
            const players = getPlayersNotInRoom();
            if (players.length === 0) {
                api.logger.debug('[RoomAnnouncer] 没有需要播报的玩家');
                return;
            }
            api.logger.info(`[RoomAnnouncer] 房间列表已更新，向 ${players.length} 名玩家播报`);
            // 通过游戏协议向每个未在房间中的玩家发送系统消息
            let sentCount = 0;
            for (const player of players) {
                const success = api.sendCommandToUser(player.id, {
                    type: 5,
                    message: {
                        type: 'Chat',
                        user: -1,
                        content: content,
                    },
                });
                if (success)
                    sentCount++;
            }
            api.logger.info(`[RoomAnnouncer] 已向 ${sentCount}/${players.length} 名玩家发送消息`);
        }
        // 向特定玩家播报房间列表
        function announceRoomListToUser(userId, userName) {
            const message = generateRoomListMessage();
            const content = message ?? `\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n${messagePrefix} 当前没有公开房间`;
            api.logger.info(`[RoomAnnouncer] 向玩家 ${userName} (ID: ${userId}) 播报房间列表`);
            // 通过游戏协议向该玩家发送系统消息
            const success = api.sendCommandToUser(userId, {
                type: 5,
                message: {
                    type: 'Chat',
                    user: -1,
                    content: content,
                },
            });
            if (success) {
                api.logger.info(`[RoomAnnouncer] 消息已发送给 ${userName}`);
            }
            else {
                api.logger.warn(`[RoomAnnouncer] 发送消息给 ${userName} 失败`);
            }
        }
        // 检测房间变化
        function checkRoomChanges() {
            const currentSnapshot = getRoomSnapshot();
            if (currentSnapshot !== lastRoomSnapshot) {
                lastRoomSnapshot = currentSnapshot;
                announceRoomList();
            }
        }
        // 初始化房间快照
        lastRoomSnapshot = getRoomSnapshot();
        // 启动定时检测
        checkTimer = setInterval(checkRoomChanges, checkInterval);
        api.logger.info(`[RoomAnnouncer] 插件已加载，检测间隔: ${checkInterval}ms`);
        api.logger.info(`[RoomAnnouncer] 配置: enablePubWeb=${enablePubWeb}, enablePriWeb=${enablePriWeb}, announceOnJoin=${announceOnJoin}`);
        // 监听玩家登录事件
        if (announceOnJoin) {
            api.logger.info('[RoomAnnouncer] 正在注册 player:auth:success 事件监听器...');
            const unsubAuth = api.events.on('player:auth:success', (payload) => {
                api.logger.debug(`[RoomAnnouncer] 收到 player:auth:success 事件: ${JSON.stringify(payload)}`);
                const { user } = payload;
                // 延迟一下再播报，确保玩家已完全加载
                setTimeout(() => {
                    api.logger.info(`[RoomAnnouncer] 向玩家 ${user.name} (ID: ${user.id}) 播报房间列表`);
                    announceRoomListToUser(user.id, user.name);
                }, announceDelay);
            });
            unsubscribers.push(unsubAuth);
            api.logger.info(`[RoomAnnouncer] 已启用玩家登录时播报 (延迟: ${announceDelay}ms)`);
        }
        // 监听房间事件
        unsubscribers.push(api.events.on('room:create', () => {
            // 房间创建时立即检测
            setTimeout(checkRoomChanges, 500);
        }));
        unsubscribers.push(api.events.on('room:join', () => {
            // 玩家加入房间时立即检测
            setTimeout(checkRoomChanges, 500);
        }));
        unsubscribers.push(api.events.on('room:leave', () => {
            // 玩家离开房间时立即检测
            setTimeout(checkRoomChanges, 500);
        }));
        // 注册控制台命令
        api.registerCommand('roomlist', () => {
            const message = generateRoomListMessage();
            if (message) {
                api.logger.info(message);
            }
            else {
                api.logger.info('[RoomAnnouncer] 当前没有公开房间');
            }
        });
        api.registerCommand('roomannouncer', (action) => {
            if (action === 'status') {
                // 使用新的 API 获取服务器统计
                const stats = api.getServerStats();
                const allRooms = api.getRooms();
                const filteredRooms = filterRooms(allRooms);
                const players = getPlayersNotInRoom();
                api.logger.info('[RoomAnnouncer] 状态:');
                api.logger.info(`  服务器: ${stats.serverName}`);
                api.logger.info(`  在线玩家: ${stats.onlinePlayers}`);
                api.logger.info(`  总房间数: ${allRooms.length}`);
                api.logger.info(`  公开房间数: ${filteredRooms.length}`);
                api.logger.info(`  未在房间中的玩家数: ${players.length}`);
                api.logger.info(`  检测间隔: ${checkInterval}ms`);
                api.logger.info(`  房间过滤: enablePubWeb=${enablePubWeb}, enablePriWeb=${enablePriWeb}`);
                api.logger.info(`  服务器运行时间: ${Math.floor(stats.uptime / 60)} 分钟`);
            }
            else if (action === 'announce') {
                announceRoomList();
                api.logger.info('[RoomAnnouncer] 手动播报完成');
            }
            else {
                api.logger.info('[RoomAnnouncer] 命令:');
                api.logger.info('  /roomannouncer status - 查看状态');
                api.logger.info('  /roomannouncer announce - 手动播报');
            }
        });
    },
    destroy() {
        // 清理定时器
        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
        }
        // 取消事件监听
        unsubscribers.forEach(unsub => unsub());
        unsubscribers.length = 0;
    },
};
exports.default = pluginModule;
