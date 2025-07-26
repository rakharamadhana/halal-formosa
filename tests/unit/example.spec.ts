import { mount } from '@vue/test-utils'
import SearchView from '../../src/views/SearchView.vue'
import { describe, expect, test } from 'vitest'

describe('SearchView.vue', () => {
  test('renders tab 1 SearchView', () => {
    const wrapper = mount(SearchView)
    expect(wrapper.text()).toMatch('Tab 1 page')
  })
})
