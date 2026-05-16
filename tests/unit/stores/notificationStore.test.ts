import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationStore } from '../../../src/store/notificationStore'

describe('NotificationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useNotificationStore.getState().clearNotifications()
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should have empty notifications array', () => {
      const state = useNotificationStore.getState()
      
      expect(state.notifications).toEqual([])
      expect(state.unreadCount).toBe(0)
    })
  })

  describe('addNotification', () => {
    it('should add a notification', () => {
      useNotificationStore.getState().addNotification({
        title: 'Test Notification',
        message: 'This is a test',
        type: 'info'
      })

      const state = useNotificationStore.getState()
      
      expect(state.notifications).toHaveLength(1)
      expect(state.notifications[0].title).toBe('Test Notification')
      expect(state.notifications[0].message).toBe('This is a test')
      expect(state.notifications[0].type).toBe('info')
      expect(state.notifications[0].read).toBe(false)
    })

    it('should generate unique id for notification', () => {
      useNotificationStore.getState().addNotification({
        title: 'Notification 1',
        message: 'Message 1',
        type: 'info'
      })

      useNotificationStore.getState().addNotification({
        title: 'Notification 2',
        message: 'Message 2',
        type: 'success'
      })

      const state = useNotificationStore.getState()
      
      expect(state.notifications[0].id).toBeTruthy()
      expect(state.notifications[1].id).toBeTruthy()
      expect(state.notifications[0].id).not.toBe(state.notifications[1].id)
    })

    it('should add notification with ordenId', () => {
      useNotificationStore.getState().addNotification({
        title: 'Order Updated',
        message: 'Order has been updated',
        type: 'success',
        ordenId: 'order123'
      })

      const state = useNotificationStore.getState()
      
      expect(state.notifications[0].ordenId).toBe('order123')
    })

    it('should add notification with current date', () => {
      const beforeAdd = new Date()
      
      useNotificationStore.getState().addNotification({
        title: 'Test',
        message: 'Test message',
        type: 'info'
      })

      const state = useNotificationStore.getState()
      const notificationDate = new Date(state.notifications[0].date)
      
      expect(notificationDate.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime())
    })

    it('should add new notifications at the beginning', () => {
      useNotificationStore.getState().addNotification({
        title: 'First',
        message: 'First message',
        type: 'info'
      })

      useNotificationStore.getState().addNotification({
        title: 'Second',
        message: 'Second message',
        type: 'info'
      })

      const state = useNotificationStore.getState()
      
      expect(state.notifications[0].title).toBe('Second')
      expect(state.notifications[1].title).toBe('First')
    })

    it('should increment unreadCount', () => {
      useNotificationStore.getState().addNotification({
        title: 'Test 1',
        message: 'Message 1',
        type: 'info'
      })

      expect(useNotificationStore.getState().unreadCount).toBe(1)

      useNotificationStore.getState().addNotification({
        title: 'Test 2',
        message: 'Message 2',
        type: 'info'
      })

      expect(useNotificationStore.getState().unreadCount).toBe(2)
    })

    it('should not duplicate notifications for the same order', () => {
      useNotificationStore.getState().addNotification({
        title: 'Nueva orden asignada',
        message: 'Se te ha asignado la orden: DDDDD',
        type: 'info',
        ordenId: 'order123'
      })

      useNotificationStore.getState().addNotification({
        title: 'Nueva orden asignada',
        message: 'Se te ha asignado la orden: DDDDD',
        type: 'info',
        ordenId: 'order123'
      })

      const state = useNotificationStore.getState()

      expect(state.notifications).toHaveLength(1)
      expect(state.unreadCount).toBe(1)
    })
  })

  describe('setNotificationOwner', () => {
    it('should clear notifications when the authenticated user changes', () => {
      useNotificationStore.getState().setNotificationOwner('user-1')
      useNotificationStore.getState().addNotification({
        title: 'Nueva orden asignada',
        message: 'Se te ha asignado la orden: DDDDD',
        type: 'info',
        ordenId: 'order123'
      })

      useNotificationStore.getState().setNotificationOwner('admin-1')

      const state = useNotificationStore.getState()

      expect(state.ownerId).toBe('admin-1')
      expect(state.notifications).toEqual([])
      expect(state.unreadCount).toBe(0)
    })

    it('should keep notifications when the owner does not change', () => {
      useNotificationStore.getState().setNotificationOwner('user-1')
      useNotificationStore.getState().addNotification({
        title: 'Test',
        message: 'Test message',
        type: 'info'
      })

      useNotificationStore.getState().setNotificationOwner('user-1')

      expect(useNotificationStore.getState().notifications).toHaveLength(1)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      useNotificationStore.getState().addNotification({
        title: 'Test',
        message: 'Test message',
        type: 'info'
      })

      const notificationId = useNotificationStore.getState().notifications[0].id
      useNotificationStore.getState().markAsRead(notificationId)

      const state = useNotificationStore.getState()
      
      expect(state.notifications[0].read).toBe(true)
      expect(state.unreadCount).toBe(0)
    })

    it('should only mark specific notification as read', () => {
      useNotificationStore.getState().addNotification({
        title: 'Test 1',
        message: 'Message 1',
        type: 'info'
      })

      useNotificationStore.getState().addNotification({
        title: 'Test 2',
        message: 'Message 2',
        type: 'info'
      })

      const firstId = useNotificationStore.getState().notifications[1].id
      useNotificationStore.getState().markAsRead(firstId)

      const state = useNotificationStore.getState()
      
      expect(state.notifications[1].read).toBe(true)
      expect(state.notifications[0].read).toBe(false)
      expect(state.unreadCount).toBe(1)
    })

    it('should handle invalid notification id', () => {
      useNotificationStore.getState().addNotification({
        title: 'Test',
        message: 'Test message',
        type: 'info'
      })

      useNotificationStore.getState().markAsRead('invalid-id')

      const state = useNotificationStore.getState()
      
      expect(state.notifications[0].read).toBe(false)
      expect(state.unreadCount).toBe(1)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      useNotificationStore.getState().addNotification({
        title: 'Test 1',
        message: 'Message 1',
        type: 'info'
      })

      useNotificationStore.getState().addNotification({
        title: 'Test 2',
        message: 'Message 2',
        type: 'success'
      })

      useNotificationStore.getState().addNotification({
        title: 'Test 3',
        message: 'Message 3',
        type: 'warning'
      })

      useNotificationStore.getState().markAllAsRead()

      const state = useNotificationStore.getState()
      
      expect(state.notifications.every(n => n.read)).toBe(true)
      expect(state.unreadCount).toBe(0)
    })

    it('should work with empty notifications', () => {
      useNotificationStore.getState().markAllAsRead()

      const state = useNotificationStore.getState()
      
      expect(state.notifications).toHaveLength(0)
      expect(state.unreadCount).toBe(0)
    })
  })

  describe('clearNotifications', () => {
    it('should clear all notifications', () => {
      useNotificationStore.getState().addNotification({
        title: 'Test 1',
        message: 'Message 1',
        type: 'info'
      })

      useNotificationStore.getState().addNotification({
        title: 'Test 2',
        message: 'Message 2',
        type: 'success'
      })

      useNotificationStore.getState().clearNotifications()

      const state = useNotificationStore.getState()
      
      expect(state.notifications).toHaveLength(0)
      expect(state.unreadCount).toBe(0)
    })
  })

  describe('Notification Types', () => {
    it('should handle info notifications', () => {
      useNotificationStore.getState().addNotification({
        title: 'Info',
        message: 'Info message',
        type: 'info'
      })

      expect(useNotificationStore.getState().notifications[0].type).toBe('info')
    })

    it('should handle success notifications', () => {
      useNotificationStore.getState().addNotification({
        title: 'Success',
        message: 'Success message',
        type: 'success'
      })

      expect(useNotificationStore.getState().notifications[0].type).toBe('success')
    })

    it('should handle warning notifications', () => {
      useNotificationStore.getState().addNotification({
        title: 'Warning',
        message: 'Warning message',
        type: 'warning'
      })

      expect(useNotificationStore.getState().notifications[0].type).toBe('warning')
    })

    it('should handle error notifications', () => {
      useNotificationStore.getState().addNotification({
        title: 'Error',
        message: 'Error message',
        type: 'error'
      })

      expect(useNotificationStore.getState().notifications[0].type).toBe('error')
    })
  })

  describe('Persistence', () => {
    it('should persist notifications to localStorage', () => {
      useNotificationStore.getState().addNotification({
        title: 'Test',
        message: 'Test message',
        type: 'info'
      })

      const stored = localStorage.getItem('notification-storage')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.state.notifications).toHaveLength(1)
    })
  })

  describe('UnreadCount Calculation', () => {
    it('should calculate unreadCount correctly', () => {
      // Add 3 notifications
      useNotificationStore.getState().addNotification({
        title: 'Test 1',
        message: 'Message 1',
        type: 'info'
      })
      useNotificationStore.getState().addNotification({
        title: 'Test 2',
        message: 'Message 2',
        type: 'info'
      })
      useNotificationStore.getState().addNotification({
        title: 'Test 3',
        message: 'Message 3',
        type: 'info'
      })

      expect(useNotificationStore.getState().unreadCount).toBe(3)

      // Mark one as read
      const firstId = useNotificationStore.getState().notifications[0].id
      useNotificationStore.getState().markAsRead(firstId)

      expect(useNotificationStore.getState().unreadCount).toBe(2)

      // Mark all as read
      useNotificationStore.getState().markAllAsRead()

      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })
  })
})
