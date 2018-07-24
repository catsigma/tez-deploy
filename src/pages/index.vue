<script>
  import { G } from '~/js/data.js'

  export default {
    data() {
      return {
        g: G,
        interval: 45,
        countdown: 0,
        content: '',
        output: '',
        error: '',
        val_map: {},
        batch_tx_map: {},
        spendable: false,
        delegatable: true,
        delegate: '',
        single_op: true
      }
    },
    methods: {
      timer() {
        this.countdown = this.interval
        const t = setInterval(() => {
          this.countdown -= 1
          if (this.countdown === 0)
            clearInterval(t)
        }, 1000)
        return this.interval * 1000
      },
      replace(content, replacement) {
        return this.objReplace(content, replacement, this.val_map)
      },
      objReplace(content, replacement, mapping_obj) {
        return content.replace(new RegExp(Object.keys(replacement).join('|'), 'g'), m => {
          return mapping_obj ? mapping_obj[replacement[m]] : replacement[m]
        })
      },
      tryBatchTransfer() {
        try {
          this.batchTransfer()
        } catch(err) {
          this.error = err.stack
        }
      },
      batchTransfer() {
        const transfer_obj = JSON.parse(this.content)

        const transfer_lst = transfer_obj.transactions
        const contracts = transfer_obj.contracts

        let p = tezbridge({method: 'public_key_hash'}).then(admin => {
          this.val_map.ADMIN = admin
          this.g.admin = admin
        })

        if (this.single_op) {
          p = p.then(() => {
            return tezbridge({
              method: 'operations',
              operations: transfer_lst.map(transaction => {
                return {
                  method: 'transfer', 
                  amount: transaction.amount || 0,
                  destination: this.objReplace(transaction.destination, contracts),
                  parameters: JSON.parse(this.objReplace(JSON.stringify(transaction.parameters), contracts))
                }
              })
            })
            .then(x => {
              this.batch_tx_map[`all`] = true
              this.output = JSON.stringify(this.batch_tx_map, null, 4)
            })
          })
        } else {
          transfer_lst.forEach((transaction, index) => {
            p = p.then(() => {
              return new Promise((resolve, reject) => setTimeout(() => {
                tezbridge({
                  method: 'transfer', 
                  amount: transaction.amount || 0,
                  destination: this.objReplace(transaction.destination, contracts),
                  parameters: JSON.parse(this.objReplace(JSON.stringify(transaction.parameters), contracts))
                })
                .then(x => {
                  this.batch_tx_map[`tx(${transaction.name || index})`] = true
                  this.output = JSON.stringify(this.batch_tx_map, null, 4)
                  resolve()
                })
                .catch(err => reject(err))

              }, this.timer()))
            })
          })
        }

        p.then(() => {
          this.output = JSON.stringify(this.batch_tx_map, null, 4)
        }).catch(err => {
          this.error = err instanceof Error ? err.stack : err
        })
      },
      tryDeploy(no_injection) {
        try {
          this.deploy(no_injection)
        } catch(err) {
          this.error = err.stack
        }
      },
      deploy(no_injection) {
        if (!no_injection) {
          if (!confirm('Have you checked before?'))
            return false
        }

        this.val_map = {}

        const deploy_obj = JSON.parse(this.content)
        
        const order = deploy_obj.order
        const replacement = deploy_obj.replacement
        const contracts = deploy_obj.contracts

        let p = tezbridge({method: 'public_key_hash'}).then(admin => {
          this.val_map.ADMIN = admin
          this.g.admin = admin
        })

        order.forEach(name => {
          p = p.then(() => {
            return new Promise((resolve, reject) => setTimeout(() => {
              const script_raw = JSON.stringify(contracts[name].script)
              const storage_raw = JSON.stringify(contracts[name].storage)

              const code = JSON.parse(this.replace(script_raw, replacement))
              const storage = JSON.parse(this.replace(storage_raw, replacement))

              tezbridge({
                method: 'originate', 
                no_injection,
                balance: 0,
                script: {
                  code,
                  storage
                },
                spendable: this.spendable,
                delegatable: this.delegatable,
                delegate: this.delegate ? this.delegate : undefined
              })
              .then(x => {
                this.val_map[`CONTRACT.${name}`] = [].concat.apply([], x.contracts)[0]
                this.output = JSON.stringify(this.val_map, null, 4)
                resolve()
              })
              .catch(err => reject(err))

            }, no_injection ? 0 : this.timer()))

          })
        })

        p.then(() => {
          this.output = JSON.stringify(this.val_map, null, 4)

          if (!no_injection)
            this.g.deployed_contracts = JSON.parse(this.output)
        }).catch(err => {
          this.error = err instanceof Error ? err.stack : err
        })
      }
    }
  }
</script>

<template>
  <div>
    <textarea placeholder="input deployment or transaction JSON here" v-model="content"></textarea>
    <div class="option">
      <label><span>spendable:</span> <input type="checkbox" v-model="spendable" /></label> <br>
      <label><span>delegatable:</span> <input type="checkbox" v-model="delegatable" /></label> <br>
      <label><span>delegate:</span> <input v-model="delegate" /></label> <br> 
      <label><span>Transaction interval:</span> <input v-model="interval" />s</label> <br> 
      <label>Transaction countdown: {{this.countdown}}s</label> <br> 
      <label><span>single operation for batch transfer:</span> <input type="checkbox" v-model="single_op" /></label> <br> 
    </div>
    <button @click="tryDeploy(true)">Check</button>
    <button @click="tryDeploy(false)">Deploy</button>
    <button @click="tryBatchTransfer">BatchTransfer</button>

    <button @click="output = ''; error = ''" class="clear-btn">Clear</button>
    <pre class="output">{{output}}</pre>
    <pre class="error">{{error}}</pre>
  </div>
</template>

<style scoped>
textarea { font-family: consolas, monospace; width: 100%; height: 300px; padding: 8px;}
.option {line-height: 2}
.option input {margin-left: 8px;}
.output {background: #e8f8dc; font-family: consolas, monospace; overflow: auto; padding: 8px; margin: 8px 0;}
.error {background: #ffe8e8; color: red; font-family: consolas, monospace; overflow: auto;  padding: 8px; margin: 8px 0;}
button {margin: 8px;}
a {text-decoration: none}
.clear-btn {float: right;}
</style>