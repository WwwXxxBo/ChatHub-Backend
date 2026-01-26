import * as Minio from 'minio'
import net from 'net'

// 测试网络连接
async function testNetworkConnection() {
  console.log('=== 网络连接测试 ===')

  return new Promise((resolve) => {
    const client = new net.Socket()

    client.setTimeout(3000)

    client.connect(9005, '127.0.0.1', () => {
      console.log('✅ TCP连接成功 (127.0.0.1:9005)')
      client.destroy()
      resolve(true)
    })

    client.on('error', (error) => {
      console.log('❌ TCP连接失败')
      console.log('错误:', error.message)
      resolve(false)
    })

    client.on('timeout', () => {
      console.log('❌ 连接超时')
      client.destroy()
      resolve(false)
    })
  })
}

// 测试MinIO连接
async function testMinioConnection() {
  console.log('\n=== MinIO连接测试 ===')

  const configs = [
    {
      name: '配置1: HTTP (无SSL)',
      config: {
        endPoint: '127.0.0.1',
        port: 9005,
        useSSL: false,
        accessKey: 'isaacwx',
        secretKey: '12345678',
      },
    },
    {
      name: '配置2: 使用 localhost',
      config: {
        endPoint: 'localhost',
        port: 9005,
        useSSL: false,
        accessKey: 'isaacwx',
        secretKey: '12345678',
      },
    },
    {
      name: '配置3: 使用 0.0.0.0',
      config: {
        endPoint: '0.0.0.0',
        port: 9005,
        useSSL: false,
        accessKey: 'isaacwx',
        secretKey: '12345678',
      },
    },
  ]

  for (const { name, config } of configs) {
    console.log(`\n测试: ${name}`)
    console.log('配置:', JSON.stringify(config, null, 2))

    try {
      const client = new Minio.Client(config)

      // 先测试简单操作
      console.log('正在连接...')
      const buckets = await client.listBuckets()

      console.log('✅ 连接成功！')
      console.log(
        '存储桶列表:',
        buckets.map((b) => b.name),
      )

      return { success: true, config }
    } catch (error) {
      console.log('❌ 连接失败')
      console.log('错误代码:', error.code || '无')
      console.log('错误信息:', error.message)
      console.log('错误详情:', error)
    }
  }

  return { success: false }
}

// 测试HTTP直接访问
async function testHttpAccess() {
  console.log('\n=== HTTP API测试 ===')

  try {
    const response = await fetch('http://127.0.0.1:9005/minio/health/live')
    console.log(`✅ HTTP访问成功 (状态码: ${response.status})`)
    return true
  } catch (error) {
    console.log('❌ HTTP访问失败')
    console.log('错误:', error.message)
    return false
  }
}

// 主函数
async function main() {
  console.log('=== MinIO连接问题诊断 ===\n')

  // 1. 测试网络连接
  const networkOk = await testNetworkConnection()

  if (!networkOk) {
    console.log('\n💡 网络连接失败，请检查：')
    console.log('1. MinIO服务是否运行？')
    console.log('2. 端口是否正确？你的MinIO运行在9005端口')
    console.log('3. 防火墙是否阻止了连接？')
    return
  }

  // 2. 测试HTTP访问
  const httpOk = await testHttpAccess()

  if (!httpOk) {
    console.log('\n💡 HTTP访问失败，但TCP连接成功')
    console.log('可能MinIO服务没有正确响应HTTP请求')
    console.log('尝试重启MinIO服务')
    return
  }

  // 3. 测试MinIO客户端连接
  const result = await testMinioConnection()

  if (!result.success) {
    console.log('\n💡 所有配置都失败了')
    console.log('可能的原因：')
    console.log('1. 凭据错误 - 使用 isaacwx / 12345678')
    console.log('2. MinIO版本兼容性问题')
    console.log('3. 尝试更新minio客户端: npm update minio')
  } else {
    console.log('\n🎉 成功找到可用的配置：', result.config)
  }
}

main().catch(console.error)
