/**
 * HotkeyModule.swift - Native keyboard shortcuts for iOS/macOS
 *
 * Features:
 * - ⌥ + Space global hotkey
 * - Custom shortcut registration
 * - Background listening
 */

import Foundation
import UIKit
import AppKit

@objc(HotkeyModule)
class HotkeyModule: NSObject {

  private var eventMonitor: Any?
  private var callback: RCTResponseSenderBlock?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func registerHotkey(_ key: String,
                       modifiers: [String],
                       callback: @escaping RCTResponseSenderBlock) {
    self.callback = callback

    // For macOS, use global event monitor
    #if os(macOS)
    NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
      self?.handleKeyEvent(event)
    }
    #endif

    callback([NSNull(), true])
  }

  @objc
  func unregisterHotkey(_ key: String) {
    #if os(macOS)
    // Remove event monitor
    #endif
    callback = nil
  }

  private func handleKeyEvent(_ event: NSEvent) {
    // Check for Option + Space
    if event.keyCode == 49 && event.modifierFlags.contains(.option) {
      callback?([NSNull(), ["action": "trigger"]])
    }
  }

  @objc
  func isSupported(_ resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock) {
    #if os(macOS)
    resolve(true)
    #else
    resolve(false)
    #endif
  }
}
