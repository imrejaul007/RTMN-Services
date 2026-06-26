Pod::Spec.new do |s|
  s.name             = 'GenieSDK'
  s.version          = '1.0.0'
  s.summary          = 'Official iOS SDK for HOJAI Genie AI'
  s.description     = <<-DESC
    Genie is your personal AI companion for memory, life, and growth.
    This SDK provides full access to Genie's capabilities including
    text/voice chat, briefings, memory search, calendar integration,
    and real-time voice sessions.
  DESC
  s.homepage         = 'https://hojai.ai'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'HOJAI AI' => 'dev@hojai.ai' }
  s.source           = { :git => 'https://github.com/imrejaul007/hojai-ai.git', :tag => s.version.to_s }
  s.ios.deployment_target = '15.0'
  s.swift_version    = '5.7'
  s.source_files     = 'Sources/**/*.swift'
  s.frameworks       = 'AVFoundation', 'Foundation'
  s.dependency       'SnapKit', '~> 5.6'
end
